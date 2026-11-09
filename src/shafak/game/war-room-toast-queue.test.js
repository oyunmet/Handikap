import assert from "node:assert/strict";
import test from "node:test";
import {
  appendWarRoomToast,
  removeWarRoomToast,
  WAR_ROOM_TOAST_LIMIT,
} from "./war-room-toast-queue.ts";

test("War Room toasts stay queued in order and keep only the visible limit", () => {
  const queue = [
    { id: 1, message: "Birinci" },
    { id: 2, message: "İkinci" },
  ];

  assert.deepEqual(
    appendWarRoomToast(queue, { id: 3, message: "Üçüncü" }),
    [
      { id: 1, message: "Birinci" },
      { id: 2, message: "İkinci" },
      { id: 3, message: "Üçüncü" },
    ],
  );
  assert.deepEqual(
    appendWarRoomToast([...queue, { id: 3, message: "Üçüncü" }], { id: 4, message: "Dördüncü" }),
    [
      { id: 2, message: "İkinci" },
      { id: 3, message: "Üçüncü" },
      { id: 4, message: "Dördüncü" },
    ],
  );
  assert.equal(WAR_ROOM_TOAST_LIMIT, 3);
});

test("War Room toast queue ignores blank and duplicate notifications and expires by id", () => {
  const queue = [{ id: 1, message: "Kapı açıldı" }];
  assert.deepEqual(appendWarRoomToast(queue, { id: 1, message: "Tekrar" }), queue);
  assert.deepEqual(appendWarRoomToast(queue, { id: 2, message: "  " }), queue);
  assert.deepEqual(removeWarRoomToast([...queue, { id: 2, message: "Komutan" }], 1), [
    { id: 2, message: "Komutan" },
  ]);
});
