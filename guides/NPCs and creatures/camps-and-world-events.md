---
title: Camps and world events
description: Choose who spawns Overland's enemy camps and roaming encounters, run them from the server so every player meets the same ones, and set what they pay.
sidebar:
  order: 41
---

Overland is full of enemy camps and roaming encounters. In single player the game spawns them on its own; in multiplayer the server decides who spawns them. Mission enemies always come from the game and are not affected.

## The encounter policy

`World.setEncounterPolicy(policy)` sets it for every client, and `World.encounterPolicy` reads it back:

| Policy | Effect |
| --- | --- |
| `"suppressed"` (the default) | Nobody spawns camps or roaming encounters. |
| `"native"` | Each player's own game spawns its own, unsynced: players see different enemies in the same place. |
| `"server"` | The server spawns camps and world events as replicated NPCs, so every player meets the same ones. |

```js
// server/main.js
Events.on("resourceStart", (resourceName) => {
  if (resourceName !== "my-gamemode") return;
  World.setEncounterPolicy("server");
});
```

Leaving `"server"` removes every camp and world-event NPC.

## Camps

Under `"server"`, a camp spawns its roster when a player comes within its trigger radius and despawns once nobody is near. Its dead come back `Camps.respawnSeconds` after the last of them died, 900 by default, once nobody is near it.

- `Camps.getAll()` lists every camp with its position, the hours it may be active, whether it is active, how many enemies its roster rolled and how many have died, and its live NPCs.
- `Camps.get(id)` returns one camp, by an id such as `"<level>:<actor>"` from `getAll`.
- `Camps.revive(id)` despawns a camp and brings its dead back for the next player to arrive.
- `Camps.setRespawnSeconds(seconds)` sets how long the dead stay dead, from 0 to a week.

The `campActivated` event fires with the camp's id when its roster spawns, and `campCleared` when every enemy of an active camp has died:

```js
// server/main.js
Events.on("campCleared", (campId) => {
  const camp = Camps.get(campId);
  if (camp) Chat.sendToAll(`A camp near ${Math.round(camp.x / 100)}, ${Math.round(camp.y / 100)} has been cleared.`);
});
```

The built-in camps cover the base game. A camp that a player's game places beyond it, in a modded level, is learned from that player's report and listed with `source: "harvested"`.

## World events

World events are the game's roaming encounters, run once on the server so every player meets the same one. A spot rolls when a player comes within 100 m: each kind of encounter it can run has a 60% chance, with at most 3 of a kind active at once, then a size and a roster. When every player has left its range, the event despawns and the spot cools down for `WorldEvents.cooldownHours` of in-game time, 24 by default.

- `WorldEvents.getAll()` and `WorldEvents.get(id)` describe each spot: the kinds it can run, its state (`"waiting"`, `"failed"`, `"active"` or `"cooldown"`), the running kind and its live NPCs.
- `WorldEvents.start(id, kind)` starts an event at a spot now, whatever its roll, cooldown or hours.
- `WorldEvents.reset(id)` despawns a spot's event and clears its cooldown.
- `WorldEvents.setCooldownHours(hours)` sets the cooldown, from 0 to 720 hours.
- `WorldEvents.setEnabled(false)` turns world events off and despawns the running ones. Camps are not affected.

`worldEventStarted` fires with the spot's id and the encounter kind, such as `WE_ENEMY_ENCOUNTER_WOLF`; `worldEventCleared` when every enemy of a running event has died; and `worldEventEnded` when it despawns.

Only players in [virtual world](/guides/core-concepts/virtual-worlds/) 0 in Overland trigger and see world events, and the built-in camps are in world 0 too. Players you have moved into another world meet neither.

## What their enemies pay

Camp and world-event enemies follow the same [reward policies](/guides/npcs-and-creatures/npcs/#what-a-death-pays) as any NPC:

```js
// server/main.js
Camps.setRewardPolicy({ experience: 25 });
Camps.setRewardPolicy({ loot: [{ itemId: "LeechJuice", count: [2, 4] }] }, campId);
WorldEvents.setRewardPolicy({ recipients: "nearby", radius: 5000 });
```

A camp's own policy wins, then the camps-wide one, then `NPC.setDefaultRewardPolicy`. World events have one policy for all of them. `getRewardPolicy` reads back what applies, with the defaults filled in.

## Where to go next

- [NPCs](/guides/npcs-and-creatures/npcs/) for spawning and controlling enemies yourself.
- [Virtual worlds](/guides/core-concepts/virtual-worlds/) for why players outside world 0 miss these encounters.
