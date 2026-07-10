"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

interface MpBricksController {
  unmount: () => void;
}
interface MpBricksBuilder {
  create: (
    brick: string,
    containerId: string,
    settings: unknown,
  ) => Promise<MpBricksController>;
}
interface MpInstance {
  bricks: () => MpBricksBuilder;
}
declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => MpInstance;
  }
}

type CardFormData = { token?: string; payer?: { email?: string } };

interface PixState {
  paymentId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  guestToken: string | null;
}

const ERRORS: Record<string, string> = {
  parametros: "Plano ou método inválidos.",
  email: "Informe um e-mail válido para continuar.",
  indisponivel:
    "Pagamento indisponível no momento. Fale com a gente no WhatsApp.",
  pix: "Não deu para gerar o Pix. Tente de novo.",
  cartao: "Preencha os dados do cartão.",
  cartao_recusado: "Cartão recusado. Confira os dados ou tente outro.",
  falha: "Algo deu errado. Tente de novo.",
};

/**
 * Transparent checkout UI (PAY-008). Pix is server-driven (we render the QR the
 * API returns and poll for approval); card uses the Mercado Pago Card Payment
 * Brick (tokenized in the browser, never sending the PAN to us).
 *
 * The Brick injects its own DOM (iframes) into `#cardPaymentBrick_container`, so
 * that container is kept mounted for the component's whole life and tabs are
 * toggled with CSS — never with conditional mount/unmount. Removing the Brick's
 * node via React reconciliation throws `removeChild` and blanks the other tab.
 * The Brick also renders its own e-mail field, so we only show ours on Pix.
 */
export function CheckoutClient({
  plan,
  amount,
  isLoggedIn,
  initialEmail,
}: {
  plan: "month" | "year";
  amount: number;
  isLoggedIn: boolean;
  initialEmail: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<"card" | "pix">(
    PUBLIC_KEY ? "card" : "pix",
  );
  const [email, setEmail] = useState(initialEmail);
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pix, setPix] = useState<PixState | null>(null);
  const [copied, setCopied] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const brickRef = useRef<MpBricksController | null>(null);

  const planLabel = plan === "year" ? "Anual" : "Mensal";
  const priceLabel = `R$ ${amount},00 ${plan === "year" ? "/ ano" : "/ mês"}`;

  const goAfterSuccess = useCallback(
    (guestToken: string | null) => {
      if (isLoggedIn) {
        router.push("/conta");
      } else {
        router.push(
          `/checkout/sucesso?token=${encodeURIComponent(guestToken ?? "")}`,
        );
      }
      router.refresh();
    },
    [isLoggedIn, router],
  );

  // Submit the Bricks card token to our checkout route. For a logged-in buyer we
  // already know the e-mail (session); for a guest we use the one the Brick
  // collected (formData.payer.email).
  const submitCard = useCallback(
    async (formData: CardFormData) => {
      setError(null);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          method: "card",
          cardToken: formData.token,
          email: email || formData.payer?.email || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        guestToken?: string | null;
      };
      if (!res.ok || data.error) {
        setError(ERRORS[data.error ?? "falha"] ?? ERRORS.falha);
        throw new Error(data.error ?? "falha");
      }
      goAfterSuccess(data.guestToken ?? null);
    },
    [plan, email, goAfterSuccess],
  );

  // Keep the Brick's onSubmit pointing at the latest closure without remounting.
  const submitCardRef = useRef(submitCard);
  useEffect(() => {
    submitCardRef.current = submitCard;
  }, [submitCard]);

  // Mount the card Brick ONCE when the SDK is ready. The container stays in the
  // DOM for good (tabs toggle via CSS), so React never removes MP's nodes.
  useEffect(() => {
    if (!sdkLoaded || !PUBLIC_KEY || !window.MercadoPago || brickRef.current) {
      return;
    }
    let cancelled = false;
    const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "pt-BR" });
    mp.bricks()
      .create("cardPayment", "cardPaymentBrick_container", {
        initialization: {
          amount,
          ...(initialEmail ? { payer: { email: initialEmail } } : {}),
        },
        customization: { visual: { style: { theme: "dark" } } },
        callbacks: {
          onReady: () => undefined,
          onSubmit: (formData: CardFormData) => submitCardRef.current(formData),
          onError: () => setError(ERRORS.cartao_recusado),
        },
      })
      .then((controller) => {
        if (cancelled) controller.unmount();
        else brickRef.current = controller;
      })
      .catch(() =>
        setError("Não foi possível carregar o formulário de cartão."),
      );
    return () => {
      cancelled = true;
      brickRef.current?.unmount();
      brickRef.current = null;
    };
  }, [sdkLoaded, amount, initialEmail]);

  // Poll Pix status until approved, then advance.
  useEffect(() => {
    if (!pix?.paymentId) return;
    let stop = false;
    const iv = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/checkout/status?paymentId=${encodeURIComponent(pix.paymentId)}`,
          );
          const data = (await res.json()) as { status?: string };
          if (data.status === "approved" && !stop) {
            stop = true;
            clearInterval(iv);
            goAfterSuccess(pix.guestToken);
          }
        } catch {
          // keep polling
        }
      })();
    }, 4000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [pix, goAfterSuccess]);

  async function generatePix() {
    if (!email.trim()) {
      setError(ERRORS.email);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          method: "pix",
          email: email || undefined,
          cpf: cpf || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        paymentId?: string;
        qrCode?: string | null;
        qrCodeBase64?: string | null;
        ticketUrl?: string | null;
        guestToken?: string | null;
      };
      if (!res.ok || data.error || !data.paymentId) {
        setError(ERRORS[data.error ?? "pix"] ?? ERRORS.pix);
        return;
      }
      setPix({
        paymentId: data.paymentId,
        qrCode: data.qrCode ?? null,
        qrCodeBase64: data.qrCodeBase64 ?? null,
        ticketUrl: data.ticketUrl ?? null,
        guestToken: data.guestToken ?? null,
      });
    } catch {
      setError(ERRORS.pix);
    } finally {
      setPending(false);
    }
  }

  function copyPix() {
    if (!pix?.qrCode) return;
    void navigator.clipboard.writeText(pix.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabBase =
    "flex-1 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors";
  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none ring-ring focus-visible:ring-2";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setSdkLoaded(true)}
      />

      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-foreground">
          Assinar <span className="text-primary">{planLabel}</span>
        </h1>
        <span className="text-sm font-semibold text-muted-foreground">
          {priceLabel}
        </span>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMethod("card")}
          disabled={!PUBLIC_KEY}
          className={`${tabBase} ${
            method === "card"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-foreground hover:border-primary/50"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Cartão
        </button>
        <button
          type="button"
          onClick={() => setMethod("pix")}
          className={`${tabBase} ${
            method === "pix"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-foreground hover:border-primary/50"
          }`}
        >
          Pix
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {/* CARD — container kept mounted; hidden (not unmounted) when Pix is active
          so MP's injected DOM is never removed by React. */}
      <div className={method === "card" ? "mt-6" : "hidden"}>
        {PUBLIC_KEY ? (
          <>
            <div id="cardPaymentBrick_container" />
            <p className="mt-3 text-xs text-muted-foreground">
              Assinatura recorrente. Seus dados de cartão vão direto ao Mercado
              Pago, criptografados. Você pode cancelar quando quiser na sua conta.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pagamento por cartão indisponível no momento. Use o Pix.
          </p>
        )}
      </div>

      {/* PIX */}
      <div className={method === "pix" ? "mt-6" : "hidden"}>
        {pix ? (
          <div className="flex flex-col items-center gap-4">
            {pix.qrCodeBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code do Pix"
                className="h-56 w-56 rounded-lg bg-white p-2"
              />
            ) : null}
            {pix.qrCode ? (
              <div className="w-full">
                <p className="mb-1 text-xs text-muted-foreground">
                  Pix copia e cola
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={pix.qrCode}
                    className={`${inputClass} truncate`}
                  />
                  <button
                    type="button"
                    onClick={copyPix}
                    className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              Aguardando o pagamento. Assim que cair, seu acesso é liberado
              automaticamente.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="voce@email.com"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">CPF (opcional)</span>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                inputMode="numeric"
                placeholder="000.000.000-00"
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={() => void generatePix()}
              disabled={pending}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Gerando…" : "Gerar Pix"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
