import { QUALITY } from './config'
import type { Sim } from './types'
import { drawAirport } from './render_airport'
import { drawCoaming, drawParticles, drawSky, drawVignette } from './render_craft'
import { drawF35 } from './render_f35'
import { drawFields, drawFarMassing } from './render_far'
import { drawOsprey } from './render_osprey'
import { drawPad } from './render_pad'
import { drawBuildings, drawTrees } from './render_props'
import { drawDistantTerrain, drawGround } from './render_terrain'

export class Renderer {
  private rotorPhase = 0
  private dust: { x: number; z: number; life: number; vx: number; vz: number }[] = []

  draw(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, dt: number) {
    const q = QUALITY[sim.quality]
    this.rotorPhase += dt * (7 + sim.craft.rotorRpm * 38)
    drawSky(ctx, w, h, sim.craft.y)
    drawGround(ctx, sim, w, h, q.groundDetail)
    drawDistantTerrain(ctx, sim.cam, w, h, q.farRidges, sim.craft.y)
    drawFields(ctx, sim.cam, w, h, q.farPatches, sim.craft.y)
    drawFarMassing(ctx, sim.cam, w, h, q.farPatches, sim.craft.y)
    // Airport before foggy props so strip stays the landmark
    drawAirport(ctx, sim.cam, w, h)
    drawPad(ctx, sim.cam, w, h)
    drawBuildings(ctx, sim, w, h, q.buildings)
    drawTrees(ctx, sim, w, h, q.trees)
    if (q.particles > 0) drawParticles(ctx, sim, w, h, dt, q.particles, this.dust)
    if (sim.craft.kind === 'f35') drawF35(ctx, sim.craft, sim.cam, w, h, q.shadows, this.rotorPhase, sim.camMode === 'cockpit')
    else drawOsprey(ctx, sim.craft, sim.cam, w, h, q.shadows, this.rotorPhase, sim.camMode === 'cockpit')
    if (sim.camMode === 'cockpit') drawCoaming(ctx, w, h)
    drawVignette(ctx, w, h)
  }
}
