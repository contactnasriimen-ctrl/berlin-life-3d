# Berlin Life 3D

A playable open-world day in Berlin, in the browser: walk, run, drive, ride the S-Bahn, go into cafés and talk to people, from sunrise to night, in sunshine or rain.

Built with React + TypeScript + Vite, three.js with React Three Fiber, drei, Rapier physics and pmndrs postprocessing. Everything is generated in code (geometry and textures); the game downloads no models or images.

## Run it

```bash
npm install
npm run dev        # http://localhost:5178
npm run build      # typecheck + production bundle in dist/
npm run preview    # serve dist/
```

Add `?debug` to the URL to expose the live game state as `window.__RT` (used by the automated browser tests).

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Walk (Z Q S D on AZERTY works too) |
| Shift | Run |
| Space | Jump · handbrake when driving |
| Mouse (click the game to capture it) or drag | Camera |
| Wheel | Zoom |
| E | Interact: get into a car, enter a shop, use the S-Bahn, talk, order |
| F | Get out of the car |
| M | Map |
| Esc | Pause menu |

Driving: W accelerates, S brakes then reverses, A/D steer.

## What is in the game

**City.** Berlin compressed to about a third of its real size. Origin is the Brandenburg Gate, +x is east, +z is south.
- The landmarks and the Spree are at their real relative positions.
- Streets form a simplified grid that carries real Berlin street names.
- Districts have their own building styles: Mitte, Tiergarten, Moabit, Kreuzberg, Friedrichshain, Charlottenburg, Neukölln and Potsdamer Platz.
- Blocks are Berlin perimeter blocks with a courtyard.
- Building styles: Altbau with balconies and mansard roofs, sandstone, Plattenbau, brick and glass towers.
- Ground floors have shops with signs and awnings, and lit windows at night.
- Streets have tree-lined pavements, street lamps, traffic lights, blue street-name plates, advertising columns (Litfaßsäulen), bus stops and café terraces.

**Landmarks** (modelled in code, `src/components/Landmarks.tsx`): Brandenburger Tor with the Quadriga, Reichstag with the glass dome, Hauptbahnhof, Potsdamer Platz towers, Siegessäule, Berliner Dom, Altes Museum, Fernsehturm, Alexanderplatz with the Weltzeituhr, Checkpoint Charlie, Oberbaumbrücke with a U-Bahn train, the East Side Gallery (original murals generated in code), the Gedächtniskirche and Hermannplatz.

**Gameplay**
- Third-person character with walk, run, jump, idle and drinking animations. Collisions use a Rapier kinematic character controller.
- Drivable cars of several types: hatchback, saloon, van, ivory Berlin taxi and the yellow BVG double-decker bus. Get into any parked or moving car with E.
- Arcade driving physics: steering, braking, reverse, handbrake, collisions and a speedometer.
- AI traffic follows the lanes and stops at red lights, behind other cars, and for you and pedestrians. Cyclists ride along the kerb.
- Pedestrians walk around the blocks and cross at green lights. Others talk in groups, sit on terraces and benches, or wait at bus stops. Press E to talk to them; they reply in German with an English translation.
- Interiors: a café, a Späti and a bakery (staff, customers, ordering).
- S-Bahn: a brick viaduct with moving trains and six stations. At a station entrance, press E to travel.
- Day–night cycle with sun, moon and stars, plus clear, cloudy or rain weather (changing on its own or fixed in Settings). Streets get wet and reflective in the rain; street lamps, windows and shop signs light up at night.

**Interface:** main menu, pause menu, settings (graphics quality, mouse sensitivity, invert Y, time of day and speed, weather, man/woman with a new random look, FPS counter), controls screen, rotating minimap, full map, interaction prompts, speedometer, time and weather, and current district and street.

**Performance**
- Buildings are merged into one mesh per material per 220 m chunk, and chunks beyond the draw distance are hidden.
- Trees, balconies, lamps, traffic lights and other street furniture are instanced; only the trees near the camera are drawn.
- Shop signs and street plates share a single texture atlas.
- People use level of detail: the nearest ones are full 3D characters, the others cheap instanced figures.
- Cars, people and parked cars are spawned around the player and removed far away.
- Quality presets (low, medium, high, ultra) set the resolution, shadows, post-processing (SSAO, bloom, SMAA), draw distance and the number of people and cars.

## Project layout

```
src/
  components/  GameScene, Player, ThirdPersonCamera, Vehicle, TrafficSystem, NPC, Building,
               BerlinEnvironment, Landmarks, SBahn, Interiors, DayNight, Weather, Effects,
               GameHUD, Minimap, Menus
  systems/     CityGen (procedural city), BuildingMesh, Textures, Materials, Human (procedural people),
               Characters, VehicleModels, VehicleController, TrafficRules, NPCBehavior,
               DayNightCycle, Quality, MapRender, Input, runtime (per-frame shared state)
  data/        cityDistricts (grid, districts, Spree, S-Bahn, street names), berlinLandmarks
```

## Not done yet

- **Real map data:** the street network is a simplified grid, not OpenStreetMap geometry. A next step would be importing OSM roads and building footprints for Mitte (ODbL, with attribution).
- **Characters:** they are procedural, fully animated humans built in code, not scanned or photo-realistic models. No suitable freely licensed rigged human models were bundled; Mixamo characters, for example, need an account and their licence does not allow redistributing the raw files.
- **Buildings:** they cannot all be entered. Only cafés, Spätis and bakeries have interiors (one shared interior per kind).
- **Public transport:** the S-Bahn works as fast travel between stations. You do not ride inside the train, and the buses drive around but cannot be boarded as a passenger (you can drive one).
- **Sound:** there is none.
- **Testing:** only a software renderer (SwiftShader) was available, at about one frame per second. Every feature was checked there without errors, but the frame rate on a real GPU has not been measured.
