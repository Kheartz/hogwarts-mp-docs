---
title: NPCs
description: Spawn the game's enemies as replicated NPCs, control their health, targets and AI, choose what their deaths pay, and react when they are hurt or die.
sidebar:
  order: 40
---

`NPC.create` spawns one of the game's enemies as a replicated NPC that every nearby player sees and fights. The server decides that it exists and holds what you set on it; its AI runs on one nearby player's client.

## Spawning

```js
// server/main.js
const grunt = NPC.create("Goblin_Grunt", x, y, z, "hostile");
if (grunt) {
  grunt.setScale(1.5);
  grunt.setMaxHealth(2000);
}
```

`NPC.create(enemyId, x, y, z, disposition, preferredOwnerId)` takes:

- `enemyId`: one of the game's enemy classes, such as `Goblin_Grunt`, `DW_Poacher_Grunt` or `Bladetooth`. The Mod's enemy catalog lists 223 of them. The server does not check the id for you, so check its spelling against the catalog.
- A position in world centimetres.
- `disposition`: `"hostile"` (the default) or `"friendly"`.
- `preferredOwnerId`: the player whose client should run its AI. It is used only if that player can see world 0 when the NPC spawns; otherwise the server picks.

It returns the NPC, or `undefined` if it could not be created. `setScale` takes effect best right after `create`, before the NPC first reaches anyone. Pass `"visual"` as its second argument to resize only the body and keep native collision.

NPCs start in [virtual world](/guides/core-concepts/virtual-worlds/#placing-entities) 0, and the NPCs a resource creates are destroyed when that resource stops.

## Who runs the AI

An NPC's AI runs on the client of one nearby player, its owner: `npc.ownerId` names them, and is 0 while the NPC is dormant because no player can see it. The server hands the NPC to another player as people come and go, and what you set on the server carries over.

Some readings come back from the owner's client. `npc.health` and `npc.maxHealth` are what the owner last reported, and read 0 until a client has embodied the NPC. `npc.targetPlayerId` and `npc.targetType` (0 none, 1 attack, 2 flee) report what the NPC is actually doing.

## Controlling an NPC

| Call | Does |
| --- | --- |
| `setMaxHealth(amount)` | Holds the NPC's max health, across owner hand-offs and level travel. 0 or less restores its own. |
| `setHealth(amount)` | Sets current health once. Does nothing while the NPC is dormant. |
| `setDisposition("hostile" \| "friendly")` | Turns the NPC against players, or out of combat. |
| `setDamageGivenMultiplier(n)` | Scales the damage it deals to players. `null` restores 1. |
| `setDamageTakenMultiplier(n)` | Scales the damage players deal to it. `null` restores 1. |
| `forceTarget(playerId, holdSeconds)` | Makes it fight one player, the way the game's taunt does. `0` releases it. |
| `launch(x, y, z, options)` | Throws it through the air, as a velocity in cm/s. |
| `kill()` | Plays its death on every client, then despawns it. |
| `destroy()` | Removes it at once, with no death. |

Five properties switch parts of its behaviour off:

| Setting | Effect |
| --- | --- |
| `npc.aiPaused = true` | It stops pathing and starts no new attack, and idles in place, but still reacts to hits. |
| `npc.combatEnabled = false` | It keeps chasing its target but never starts an attack. |
| `npc.perceptionEnabled = false` | It stops noticing players, drops its targets and idles. |
| `npc.movementFrozen = true` | Its position is locked; animation and decisions continue. |
| `npc.animationFrozen = true` | Its pose freezes on every client. |

```js
// server/main.js
function startBossFight(boss, challenger) {
  boss.setDamageTakenMultiplier(0.25);
  boss.forceTarget(challenger.id, 30);
}
```

A forced target the NPC's current owner cannot reach moves the NPC to the target's client until the force ends. Read `targetPlayerId` to see whether the force held.

## What a death pays

By default, the player whose hit finishes an NPC earns the game's own kill reward: Field Guide knowledge, experience and kill-challenge progress. A reward policy changes what is paid and to whom:

```js
// server/main.js
NPC.setDefaultRewardPolicy({ recipients: "damagers", experience: 50 });

grunt?.setRewardPolicy({
  loot: [{ itemId: "LacewingFlies", count: [1, 3], chance: 0.5 }],
  lootDelivery: "inventory",
});
```

| Field | Meaning |
| --- | --- |
| `recipients` | `"killer"` (the default), `"damagers"` (everyone who hit it) or `"nearby"` (everyone who hit it, plus every player within `radius` of the body) |
| `radius` | For `"nearby"`, in centimetres: 3000 by default, from 100 to 50000 |
| `gameReward` | Whether to pay the game's own kill reward |
| `experience` | Flat experience on top |
| `loot` | Items, each with a `count` or `[min, max]` range and a `chance` |
| `lootMode` | `"each"` (the default): every recipient gets a roll of their own. `"shared"`: one roll for the group. |
| `lootDelivery` | `"drop"` (the default) leaves a loot bag, `"inventory"` puts it straight into the recipient's inventory |

An NPC's own policy wins, and the fields it leaves out come from `NPC.setDefaultRewardPolicy`. `null` clears a policy. A death from `npc.kill()` pays nobody, and a malformed policy throws.

## Damage and death events

```js
// server/main.js
function onlinePlayer(id) {
  return PlayerManager.getAll().find((player) => player.id === id);
}

Events.on("npcDied", (npcId, enemyId, killerId, damagerIds) => {
  const killer = killerId === null ? undefined : onlinePlayer(killerId);
  killer?.sendChat(`You defeated ${enemyId}. ${damagerIds.length} players fought it.`);
});
```

- `npcDied` gives the NPC's id, its enemy id, the killer's player id (or `null`) and the ids of every player who damaged it.
- `npcDamaged` gives the NPC's id, the attacking player's id and the amount, clamped and rate-capped by the server. The attacker's client reports it, so treat it as a claim.

The player ids are network ids; a player may have left by the time you read one, so look them up among the online players rather than constructing a `Player` from the id.

## Where to go next

- [Camps and world events](/guides/npcs-and-creatures/camps-and-world-events/) for the enemies the server spawns across Overland by itself.
- [Beasts and characters](/guides/npcs-and-creatures/beasts-and-characters/) for tame creatures and stationary townspeople.
