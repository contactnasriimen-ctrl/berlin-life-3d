import type { Rect } from './cityDistricts';

export interface Landmark {
  id: string;
  name: string;
  /** position of the model origin */
  x: number;
  z: number;
  rot?: number;
  /** area kept free of generated buildings */
  clear: Rect;
  icon: string;
  info: string;
}

const R = (x: number, z: number, w: number, d: number): Rect => ({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });

export const LANDMARKS: Landmark[] = [
  { id: 'gate', name: 'Brandenburger Tor', x: 0, z: 0, clear: { x0: -20, z0: -50, x1: 100, z1: 50 }, icon: '🏛', info: 'Built 1788–1791. Symbol of division, and of reunification in 1989.' },
  { id: 'reichstag', name: 'Reichstagsgebäude', x: -55, z: -60, clear: R(-55, -60, 96, 80), icon: '🏛', info: 'Seat of the Bundestag, with Norman Foster’s glass dome.' },
  { id: 'hbf', name: 'Berlin Hauptbahnhof', x: -165, z: -275, clear: R(-165, -275, 120, 80), icon: '🚉', info: 'Europe’s largest crossing station, opened 2006.' },
  { id: 'potsdamer', name: 'Potsdamer Platz', x: 0, z: 220, clear: R(0, 220, 104, 104), icon: '🏙', info: 'Rebuilt after reunification with glass towers.' },
  { id: 'siegessaeule', name: 'Siegessäule', x: -550, z: 0, clear: R(-550, 0, 60, 60), icon: '🗼', info: 'Victory Column with the golden “Goldelse”.' },
  { id: 'dom', name: 'Berliner Dom', x: 495, z: -45, clear: R(495, -45, 80, 60), icon: '⛪', info: 'Protestant cathedral on Museum Island (1905).' },
  { id: 'museum', name: 'Altes Museum', x: 430, z: -135, clear: R(430, -125, 96, 40), icon: '🏛', info: 'Museum Island, a UNESCO World Heritage site.' },
  { id: 'tvtower', name: 'Fernsehturm', x: 605, z: -165, clear: R(605, -165, 96, 96), icon: '📡', info: 'TV tower, 368 m – the tallest structure in Germany.' },
  { id: 'alex', name: 'Alexanderplatz', x: 720, z: -165, clear: R(745, -165, 150, 96), icon: '🕐', info: 'Square with the Weltzeituhr (World Clock).' },
  { id: 'checkpoint', name: 'Checkpoint Charlie', x: 220, z: 290, clear: R(220, 290, 10, 10), icon: '🚧', info: 'Famous Cold War crossing point between East and West Berlin.' },
  { id: 'oberbaum', name: 'Oberbaumbrücke', x: 1430, z: 0, clear: R(1430, 430, 30, 80), icon: '🌉', info: 'Double-deck brick bridge between Friedrichshain and Kreuzberg.' },
  { id: 'eastside', name: 'East Side Gallery', x: 1300, z: 330, clear: { x0: 1270, z0: 300, x1: 1480, z1: 440 }, icon: '🎨', info: 'Longest surviving section of the Berlin Wall, painted by artists.' },
  { id: 'gedaechtnis', name: 'Kaiser-Wilhelm-Gedächtniskirche', x: -935, z: 385, clear: R(-935, 385, 96, 96), icon: '⛪', info: 'War-damaged church tower kept as a memorial.' },
  { id: 'karstadt', name: 'Hermannplatz', x: 1045, z: 1045, clear: R(1045, 1045, 96, 96), icon: '🛍', info: 'Neukölln’s busy square with the Karstadt building.' },
];
