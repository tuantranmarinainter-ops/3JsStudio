# Master Prompt: Recreate the full game UI with ForgeGUI

**Quick start (paste this one line into a new Claude session):**

```
Read "C:\Users\Administrator\Desktop\reference images UI\MASTER_PROMPT.md" and follow it from section 1.
```

Or copy everything below the line into the session instead.

---

You are rebuilding a complete Roblox game UI from reference screenshots. Use the **ForgeGUI MCP connector** to make the art and the **Roblox Studio MCP connector** to build it. Put the finished UI into my Roblox game that is open in Studio right now. It has to look as close to the references as possible, feel smooth, and work the same way the original does.

## 1. Inputs

**Reference folder:** `C:\Users\Administrator\Desktop\reference images UI`
Open every image in it before you plan anything. Files `01`–`18` were taken in Studio's Edit mode, so their item lists are empty. Files `19`–`29` (named `PLAY_…`) were taken in a playtest and show real content.

| File | Shows |
|---|---|
| 01_HUD_full | The whole in-game HUD |
| 02_Auras, 03_Arms, 04_Upgrades, 05_Shop | Panel frames (lists empty in Edit mode) |
| 06_Rebirth | Rebirth panel: requirement, progress bar, reward text, warning, Rebirth button |
| 07_Settings | 5 setting rows with On/Off toggles |
| 08_Index | Index panel with category tabs on the left and a progress bar at the bottom |
| 09_Inventory | Toolbar (Place Best Luck, favourite/sort icons, search box) and grid |
| 10_Sell | Total value, Sell All, ALL filter, ASC/DESC sort |
| 11_FreeGift | Reward card on the left, two tasks on the right, Claim button |
| 12_WatchRewards | 5 reward tiles and a "Free!" button |
| 13_Fuse | "Fusible Only" filter, grid, and a "Select a Cuh to Fuse!" side panel |
| 14_Trading | Trading panel frame |
| 15_OfflineEarnings | Offline earnings pop-up (cash, strength, Claim / 3x Claim) |
| 16_Notifications_Splash | Big "X2 LUCK" splash with a clover |
| 17_Notifications_Announce_Toast_Alert | Yellow-green announcement, white "+$124K" money pop-up, red alert |
| 18_HUD_with_BaseUpgrade_popup | "Slots / Buy Slot" pop-up |
| 19_PLAY_DailyRewards | Day 1–7 daily reward strip and CLAIM button |
| 20_PLAY_OfflineEarnings | Offline earnings filled in with real values |
| 21_PLAY_HUD_ingame | Live HUD, including the Invite and ADMIN buttons |
| 22_PLAY_Arms, 26_PLAY_Auras | List cards: rarity-coloured row, icon, name, rarity, multiplier, Equip |
| 23_PLAY_Shop | Shop rows: icon, title, subtitle, Robux price or "Owned" |
| 24_PLAY_Upgrades | Upgrade rows: icon, name, value, level, MAX button |
| 25_PLAY_Index | Grid of collectible tiles (silhouettes until discovered) |
| 27_PLAY_TradeWindow, 28_PLAY_TradeRequest_popup | Trade window and incoming trade request |
| 29_PLAY_AdminPanel | Admin panel (optional, see section 9) |

**Source game (read-only, never edit it):** "+1 Lift a Rock for CUH" (placeId 79409359952462). You can read its StarterGui and `StarterPlayer.StarterPlayerScripts.Controllers` to check exact behaviour. Do not change anything in it.

**Target game:** the other place open in Studio. Call `list_roblox_studios` first. If the only other place is "Untitled Experience" (placeId 132477010664197), that is the target. If anything is unclear, ask me before writing anything. When I last checked, the target had an empty StarterGui, no server scripts, and only cinematic kits (CinemaKit, SkitKit) in Workspace and ReplicatedStorage. Leave those kits untouched.

## 2. Tools and pipeline

**ForgeGUI (art):**
1. `asset_capabilities` and `publication_connections_list` are free reads. My account has an active Roblox API-key connection labelled **@fwjelaa** that can publish Image assets.
2. Upload the reference screenshots with `image_upload_authorize` → upload → `image_upload_register`, then call `style_create` once with the strongest 4 references (01, 05, 22, 23 work well). Generate everything in that one style so the set matches.
3. Make the art with `generation_gui`, using the right `type` (`gui_icon`, `gui_button`, `gui_panel`, `gui_frame`, `gui_asset`) and `reference_asset_ids`. Use `remove_background` or `asset_prepare` (deterministic image route) for transparency and resizing.
4. Publish to Roblox through the @fwjelaa connection (`artifact_publish`, then `publication_status`) to get `rbxassetid://` IDs.
5. Credits: **before generating anything, show me the full asset list and how many generations it will take, and wait for my OK.** If any call returns `insufficient_credits`, stop all paid calls, tell me in one line, and link https://forgegui.com/plans. Never regenerate an `outcome_unknown` job.

**Roblox Studio (build):** use `execute_luau` (Edit datamodel) to create instances. Work in batches and call `task.wait()` between chunks, as that tool's description warns. Use `multi_edit` or `script_read` for scripts, `screen_capture` to check your work, and `start_stop_play`, `user_mouse_input` and the Client datamodel to test. Before any phone/tablet testing, load the `rbx-device-simulator-lua` skill.

**Save art credits by tinting.** The original makes almost every button, title tab and card from **white base art tinted with a UIGradient**. Generate the white or neutral bases once and tint them in Studio. Don't generate a separate image for each colour.

## 3. Design tokens (taken from the source game, so use them exactly)

- **Font:** `FredokaOne` everywhere (213 of 213 text objects). Mostly white text with a dark outline.
- **Text outline (UIStroke):** `#14101F`, thickness 2.5 (most common), 3 or 3.5 on bigger text, ApplyStrokeMode Contextual. Big black outlines (`#000000`, 3, Border) go around panel edges.
- **Panel body:** deep purple `#4A1E66` / `#2B0E3D` / `#1C102C` covered with a **tiled raised-stud (LEGO-style) texture**. Every panel, bar and button in the references has that studded surface. Generate one seamless white stud tile and use it as `ScaleType.Tile` overlays.
- **Gradients (all Rotation 90, top → bottom):**
  - Green button: `#8CFF1E → #20D414` (alt `#9CFF3A → #33CC14`, `#B8FF5A → #5CE01E → #2EA514`)
  - Red/pink button: `#FF5A78 → #D6123A`
  - Purple: `#D65CFF → #8A12D6` (alt `#D58CFF → #9B3BFF → #6A12D6`)
  - Blue: `#6FE0FF → #1A8AE0`
  - Gray: `#5B606E → #3A3E4A`, `#4A4D58 → #33353D`
  - Brown/stone: `#6A5B52 → #4A3F39`
- **Accent text colours:** lime `#8CFF1E` / `#7DFF2A` (cash, % complete), yellow `#FFD21A` (announcements, "Exclusive"), red `#FF2E63` / `#FF3B5C` (warnings), soft lilac `#D8C8E8` (secondary text), orange `#FFB01A` / `#FF9A1A`.
- **Corner radius:** UICorner `0,10` for most elements, `0,14` for large frames, `0,8` for small elements, and scale `0.22` for pill buttons.
- **Rarity row colours** (match 22 and 26): Common gray, Uncommon green, Rare blue, Epic purple, Legendary red, then pink/magenta above that. Each row has a lighter outline in its own colour.
- **Background blur while a panel is open:** BlurEffect size 14.

## 4. Layout spec (scale values from the source; keep them)

Every ScreenGui: `IgnoreGuiInset = true`, `ResetOnSpawn = false`, `ZIndexBehavior = Sibling`. Use scale sizes plus `UIAspectRatioConstraint` throughout so the UI fits phones and PCs.

**HUD (DisplayOrder 0)**, written as name: position · size · anchor · aspect:
- Stats (rebirth count and cash): (0.01, 0.20) · (0.26, 0.20) · (0,0) · 2.6
- LeftButtons, a 2×2 UIGridLayout of Arms / Shop / Upgrades / Rebirth: (0.01, 0.39) · (0.16, 0.26) · (0,0) · 1
- Carry (backpack count "0/10"): (0.01, 0.67) · (0.15, 0.08) · (0,0) · 3
- TopButtons (Spawn / Home pills): (0.5, 0.06) · (0.36, 0.09) · (0.5,0) · 5
- Quest bar ("Fuse a Cuh at the Fuse Machine!  0/1"): (0.5, 0.155) · (0.42, 0.05) · (0.5,0) · 11
- Luck label (hidden by default): (0.5, 0.16) · (0.2, 0.04) · (0.5,0)
- RightColumn (StrengthPass card and 3 pack buttons with Robux prices, then FreeGift): (0.99, 0.255) · (0.17, 0.6) · (1,0) · 0.5
- Power ("x1.5 Power" with arm icon): (0.5, 0.725) · (0.22, 0.05) · (0.5,1) · 5
- StrengthLabel ("1 Strength"): (0.5, 0.775) · (0.36, 0.06) · (0.5,1)
- LevelBar (star icon, "Level 1", "1/10", fill): (0.5, 0.815) · (0.46, 0.07) · (0.5,0.5) · 11.5, bg `#2A2433`
- BottomLeft (FriendBoost "+0%", Index, WatchRewards "Free!", Inventory): (0.01, 0.985) · (0.26, 0.10) · (0,1) · 4
- Hotbar (centre bottom, cloned from a template): (0.5, 0.995) · (0.5, 0.11) · (0.5,1)
- Boosts (active timed boosts): (0.99, 0.985) · (0.2, 0.1) · (1,1)
- BaseUpgrade pop-up (hidden by default): (0.01, 0.86) · (0.2, 0.14) · (0,1) · 2, bg `#2B0E3D`
- Settings gear: (0.997, 0.008) · (0.03, 0.045) · (1,0) · 1

**Panel template (DisplayOrder 20).** Every panel uses the same skeleton, so build it once as a reusable function:
- `Main`: pos (0.5, 0.53), anchor (0.5, 0.5), size (0.85, 0.66), aspect 1.45
  - `Skin` ImageLabel: outer border art, pos (0,-5,0,-5), size (1,10,1,10)
  - `StudBody` Frame: inset 10 px, pos (0,10,0,10), size (1,-20,1,-20), purple with stud tile
  - `TitleTab`: pos (0.04, -0.10), size (0.38, 0.13). A tinted ribbon with a big 3D icon overlapping its left end and the title text.
  - `Close`: red rounded square with a white X, pos (0.985, 0.015), anchor (0.5,0.5), size (0.08, 0.12), aspect 1
  - `List` ScrollingFrame: pos (0.03, 0.08), size (0.94, 0.88), thin scrollbar, UIListLayout or UIGridLayout, plus a hidden `Template` to clone

Panels and their title tab colours: Auras (purple), Arms (orange), Upgrades (green), Shop titled "Featured" (pink/red), Rebirth (pink), Settings (gray-blue), Index (blue), Inventory (gray), Sell (green), Free Gift (orange), Rewards (orange), Fuse (pink), Trading (yellow). Match each panel's inner layout to its screenshot. Some panels have side elements outside the frame, such as Index's category tabs on the left and Sell's ALL / ASC / DESC buttons. Include those.

**Other ScreenGuis:** Notifications (DisplayOrder 30) with `Announce`, `Toasts`, `Alerts` (each a UIListLayout container with a hidden `Template`) and `Splash`. OfflineEarnings (DisplayOrder 40). DailyRewards. TradeWindow (`Main` and `Incoming`). InviteButton.

## 5. Behaviour spec (match exactly; this is what makes it feel right)

**PanelController (client ModuleScript):**
- Panels: Index, WatchRewards, Inventory, FreeGift, Settings, Sell, Auras, Arms, Upgrades, Shop, Rebirth, Fuse, Trading.
- **Only one panel open at a time.** Opening one closes the others.
- A panel is open when its ScreenGui is `Enabled`.
- **Open animation:** a UIScale named `OpenScale` on Main starts at 0.85 and tweens to 1 over **0.2 s, Back, Out**.
- **Blur:** a BlurEffect `PanelBlur` on the camera tweens Size to **14** while any panel is open and back to 0 when all are closed, over **0.2 s**.
- **While a panel is open, hide these HUD parts:** TopButtons, Stats, LeftButtons, Carry, RightColumn, StrengthLabel, Settings, Quest. The bottom-left icons and hotbar stay visible. Also set the HUD attribute `PanelOpen`.
- **HUD buttons toggle their panel:** LeftButtons → Arms, Shop, Upgrades, Rebirth. BottomLeft → Index, WatchRewards, Inventory. RightColumn.FreeGift → FreeGift. The gear → Settings.
- Each panel's `Close` button closes it.
- `onOpened(name, callback)`: panels rebuild their lists every time they open.
- **World stalls:** standing inside a stall's floor ring opens its panel, and walking out closes it again, but only if the ring opened it. Check every 0.2 s, counting up to 8 studs above the ring. Stalls without a ring get a ProximityPrompt instead: "Open", HoldDuration 0, range 12. Map: SellStall → Sell, AuraStall → Auras, UpgradesStall → Upgrades, ArmsStall → Arms, FuseMachine → Fuse, TradingBooth → Trading. If the target has no stalls yet, write the code so it switches on as soon as they exist.

**Every button:** press feedback using a UIScale `PressScale`, 0.9 → 1 over **0.15 s, Back, Out**. Add a subtle hover lift on PC.

**Notifications (NotifyController):**
- Announce: yellow `#FFD21A`, lasts **5 s**. Toast: green `#5BFF3B`, **2.5 s**, stacked under Spawn/Home. Alert: red `#FF2E2E`, **2.5 s**.
- At most **4 visible** per container; the oldest is removed first.
- **Identical messages merge** into one line with a counter ("Not enough Strength! (x3)") and the timer restarts.
- Clone from each container's hidden `Template`. Fire them from a `Notify` RemoteEvent with `(kind, text)`.

**Pop-ups:**
- Daily Rewards opens with a scale-in over **0.3 s, Back, Out** and closes with **0.18 s, Back, In** down to scale 0.
- Offline Earnings scales in over **0.25 s, Back, Out**.
- Small pop-ups and the money pop-up grow in over 0.18 s (Back, Out), then rise and fade over their lifetime. The fade starts at 65% of the lifetime.
- Splash ("X2 LUCK"): pops in over 0.45 s (Back) while a glow behind it spins and grows, then scales to 1.15 and fades out over 0.35 s.

**Settings toggles:** On is the green gradient, Off is the red gradient. Rows: Music, Sound Effects, Camera Effects, Vibrations, Receive Trades. Save the choices.

**List cards:** rarity-tinted rows with icon, name, rarity text, multiplier and action button (Equip / Equipped / Buy / MAX / Owned). Index tiles show a black silhouette with "???" until discovered.

## 6. Code architecture

- `StarterGui`: one ScreenGui per screen, named exactly as above, so the code can find things by path.
- `StarterPlayer.StarterPlayerScripts.Controllers` (ModuleScripts): `Ui` (find, bind, pressFx, cloneTemplate, setFill, setText), `PanelController`, `NotifyController`, `HudController`, `PopupController`, `DailyController`, `OfflineController`, `SettingsController`, `TradePanel`, plus one module per list panel. One `Client` LocalScript requires them all and calls `.start()`.
- `ReplicatedStorage.Shared`: `UiConfig` holds item lists, prices and rarities, so the content is data, not hard-coded UI. `ReplicatedStorage.Remotes` holds the RemoteEvents and RemoteFunctions.
- `--!strict`, no deprecated APIs, no `wait()` (use `task.wait`), and disconnect connections you stop using.

**Important: data and game systems.** The target game has no strength, cash, rebirth, inventory or trading systems. Make every **UI behaviour** fully work: opening and closing, tabs, toggles, sorting, search, animations, notifications and pop-ups. Drive the numbers and lists through **one `UiData` adapter module** that runs on clearly marked demo data copied from the screenshots. That way the real systems plug in later without touching the UI. **Do not build server-side game systems without asking me first.** Purchase buttons call `MarketplaceService` prompts only when a real product or gamepass ID is set in `UiConfig`. Otherwise they show an Alert saying "Not set up yet". Never invent IDs.

## 7. Phases (report briefly after each)

0. **Recon:** identify the target place, review all 29 screenshots, and read the source controllers named above if you need more detail.
1. **Asset plan:** list every image to generate (icons, white button/tab/card bases, stud tile, panel skin, close button, bars, and so on) with the generation count. **Wait for my OK.**
2. **Style and generate:** create the style, generate, clean backgrounds, and publish to Roblox. Keep an `AssetIds` ModuleScript that maps names to IDs.
3. **Build the HUD**, then capture it and compare it with 01 and 21.
4. **Build the panel template**, then all 13 panels, comparing each with its screenshot.
5. **Build the pop-ups and notifications.**
6. **Wire up behaviour** (section 5) and fill in the demo data.
7. **Verify:** playtest, open every screen with real clicks, capture each one, and save the captures to `C:\Users\Administrator\Desktop\reference images UI\recreated\` with names matching the references. Compare each pair side by side and fix the gaps. Then check a phone layout with the device simulator.
8. **Final report:** what's done, any screens that differ from the reference and why, and what is still demo data.

## 8. Acceptance checklist

- [ ] Every screen in the reference folder exists, with matching names.
- [ ] Only FredokaOne is used, along with the token colours, gradients, outlines and corner radii above.
- [ ] Stud texture on panels, bars and buttons, as in the references.
- [ ] One panel at a time, blur 14, the right HUD parts hidden, open pop at 0.85 → 1 with Back easing.
- [ ] Press squash on every button. HUD buttons toggle panels, and Close closes them.
- [ ] Notifications stack at most 4, merge repeats, and use the correct colours and timings.
- [ ] No overlap or clipping at 1920×1080, 1366×768 or a phone portrait/landscape size.
- [ ] No errors in the output during a full playtest pass (check with `get_console_output`).
- [ ] The source game is unchanged, and the target's CinemaKit and SkitKit are untouched.

## 9. Rules

- Never edit "+1 Lift a Rock for CUH". It is reference only.
- The admin panel (29) is optional: build it only if I say so, and never with working moderation actions unless I ask.
- If ForgeGUI can't get a specific icon close enough after 2 tries, tell me. The source game is also mine (creator @fwjelaa), so reusing its original image IDs is an option, but ask first.
- Don't save or publish the place for me. I'll do that.
