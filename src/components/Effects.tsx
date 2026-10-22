import { EffectComposer, Bloom, SSAO, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useGame } from '../store';
import { QUALITY } from '../systems/Quality';

/** Post-processing by quality: ambient occlusion (contact shadows), bloom on lights, vignette, anti-aliasing. */
export function Effects() {
  const quality = useGame((s) => s.settings.quality); const fx = QUALITY[quality].fx;
  if (fx === 'none') return null;
  if (fx === 'bloom') return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.45} />
      <SMAA />
    </EffectComposer>
  );
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <SSAO blendFunction={BlendFunction.MULTIPLY} samples={16} rings={4} radius={0.12} intensity={22} luminanceInfluence={0.6} worldDistanceThreshold={40} worldDistanceFalloff={10} worldProximityThreshold={2} worldProximityFalloff={1} />
      <Bloom mipmapBlur luminanceThreshold={0.88} luminanceSmoothing={0.2} intensity={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  );
}
