---
name: Duel replay precision
description: Keep the live deterministic combat simulation identical to the server's input-tape replay.
---

Directional combat input tapes store player yaw at 0.001-radian precision. Quantize yaw before both the client simulation step and serialization; rounding only during serialization can cause the server replay to drift from the state the player saw.

**Why:** Server-owned rewards depend on replaying the client input tape. A higher-precision client angle and lower-precision replay angle are different simulation inputs, even when ordinary test fights still end with the same verdict.

**How to apply:** When changing directional combat input, normalize and quantize each yaw before passing it to the simulation, then encode that exact value in the replay frame. Test both complete state equality and server frame consumption.
