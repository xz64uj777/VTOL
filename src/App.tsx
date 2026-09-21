import { useState } from 'react'
import type { QualityKey } from './game/config'
import type { BirdKind, Experience } from './game/types'
import { FlightView } from './components/FlightView'
import { Hangar } from './components/Hangar'

export default function App() {
  const [phase, setPhase] = useState<'hangar' | 'flight'>('hangar')
  const [quality, setQuality] = useState<QualityKey>('med')
  const [experience, setExperience] = useState<Experience>('intermediate')
  const [bird, setBird] = useState<BirdKind>('osprey')

  if (phase === 'hangar') {
    return (
      <div className="app">
        <Hangar
          quality={quality}
          experience={experience}
          bird={bird}
          onQuality={setQuality}
          onExperience={setExperience}
          onBird={setBird}
          onFly={() => setPhase('flight')}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <FlightView
        quality={quality}
        experience={experience}
        bird={bird}
        onHangar={() => setPhase('hangar')}
      />
    </div>
  )
}
