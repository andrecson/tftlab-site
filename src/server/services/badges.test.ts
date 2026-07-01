import assert from "node:assert/strict";
import { test } from "node:test";

import { getCompBadges } from "./badges";

const CURRENT = "patch-current";
const PREVIOUS = "patch-previous";

test("nova: introduced in current patch => isNew, not isUpdated", () => {
  const badges = getCompBadges(
    { patchIntroducedId: CURRENT, patchUpdatedId: null },
    CURRENT,
  );
  assert.deepEqual(badges, { isNew: true, isUpdated: false });
});

test("atualizada: updated in current patch (introduced earlier) => isUpdated, not isNew", () => {
  const badges = getCompBadges(
    { patchIntroducedId: PREVIOUS, patchUpdatedId: CURRENT },
    CURRENT,
  );
  assert.deepEqual(badges, { isNew: false, isUpdated: true });
});

test("nenhuma: neither introduced nor updated in current patch => no badges", () => {
  const badges = getCompBadges(
    { patchIntroducedId: PREVIOUS, patchUpdatedId: PREVIOUS },
    CURRENT,
  );
  assert.deepEqual(badges, { isNew: false, isUpdated: false });
});

test("nenhuma: no update at all (patchUpdatedId null) and introduced earlier => no badges", () => {
  const badges = getCompBadges(
    { patchIntroducedId: PREVIOUS, patchUpdatedId: null },
    CURRENT,
  );
  assert.deepEqual(badges, { isNew: false, isUpdated: false });
});

test("atualizada+nova: introduced AND updated in current patch => Novo precedence (isNew only)", () => {
  const badges = getCompBadges(
    { patchIntroducedId: CURRENT, patchUpdatedId: CURRENT },
    CURRENT,
  );
  assert.deepEqual(badges, { isNew: true, isUpdated: false });
});

test("no current patch configured (null) => no badges, even when patchUpdatedId is null", () => {
  const badges = getCompBadges(
    { patchIntroducedId: PREVIOUS, patchUpdatedId: null },
    null,
  );
  assert.deepEqual(badges, { isNew: false, isUpdated: false });
});

test("no current patch configured (undefined) => no badges", () => {
  const badges = getCompBadges(
    { patchIntroducedId: CURRENT, patchUpdatedId: CURRENT },
    undefined,
  );
  assert.deepEqual(badges, { isNew: false, isUpdated: false });
});
