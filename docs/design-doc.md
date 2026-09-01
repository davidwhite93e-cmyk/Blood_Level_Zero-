# Blood Level Zero — Original Design Doc

Blood Level Zero is a first-person, AI-driven vampire sandbox set in a fictional modern city. The player character awakens as a newly embraced vampire with no memory of their sire, no coven, and no understanding of what they've become — only a gnawing hunger and a visible "System" interface that tracks their descent into the night.

## Core Premise

You died tonight — and woke up with a status screen. No sire, no coven, no idea what you are. Just a body that doesn't need to breathe, a hunger that won't stop, and a System quietly tracking your descent. Feed carefully and rise in power. Feed recklessly and become something the city hunts.

## Tone & Genre

- **Genre:** Horror, Supernatural, Thriller
- **Tone:** Grounded urban horror with predatory tension — not campy, not romanticized. Power is real but comes with escalating cost. The city is alive and indifferent; Kindred society, hunters, and mortals all pursue their own agendas whether or not the player is watching.

## The System

Level-ups, Discipline unlocks, and meaningful stat shifts appear as distinct System-style interface text embedded in the narrative at the moment they occur — a visible pulse when something changes, not a running sidebar. Otherwise, narration is immersive first-person prose.

## Core Loop (Sandbox, Not Scripted)

The player hunts, feeds, and survives. Every feeding decision carries real tradeoffs:

| Feeding Style | Effect |
|---|---|
| Careful, controlled | Slower Hunger relief, low Heat, preserves Humanity |
| Reckless or lethal | Fast Hunger relief, powerful but raises Heat and risks Humanity loss |
| Hunger unmanaged | Creates real narrative pressure — hallucination-edged prose, loss of control, danger of frenzy |

## Disciplines (Powers)

Unlock organically through play — feeding patterns, risks taken, and relationships can open new supernatural abilities. Reflect unlocks visibly through the System.

## Relationships & Territory

- **Relationships:** NPCs (Kindred and mortal) have their own agendas, memory, and reactions to the player's choices — including reacting to rumors of the player's Heat or reputation even before direct contact.
- **Territory/Map:** The city is navigable and consequential — certain districts are safer hunting grounds, others are contested, dangerous, or claimed by rivals.

## Custom State Properties

| Property | Description |
|---|---|
| Hunger/Blood (0–100) | Core survival resource. Drops steadily, refills on feeding. Near 0 risks frenzy. |
| Disciplines | List of unlocked vampire powers, each with a description and origin. |
| Map/Territory | Known city districts, each noting safety and control (unclaimed, contested, claimed). |
| Relationships | Major NPCs (Kindred and mortal), tracking standing/trust and notable history. |
| Humanity (0–100) | Moral anchor. Drops with reckless/cruel feeding, recovers with restraint and connection. |
| Notoriety/Heat (0–100) | Attention drawn from hunters, Kindred authority, or rivals. Rises with sloppy/public feeding. |

## Key Design Principles

- No fixed ending or main quest — the Narrator improvises based on player choices.
- Consequences escalate naturally — hunter attention, Kindred political interest, or predator rivals as Heat and Notoriety rise.
- Hard content boundary — no sexual content; NPCs are never reduced to purely disposable prey. Even minor mortal characters can have names, fear, and consequence tied to how they're treated.

In short: You are a fledgling vampire with no memory, no allies, and a hunger that won't quit. How you feed shapes who you become — and what the city decides to do about you.
