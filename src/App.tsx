import { GameScene } from './components/GameScene';
import { GameHUD } from './components/GameHUD';
import { Menus } from './components/Menus';

export default function App() {
  return (
    <div className="app">
      <GameScene />
      <GameHUD />
      <Menus />
    </div>
  );
}
