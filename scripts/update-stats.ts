import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

const STATS: Record<string, { hp: number; topSpeed: number; z100: number }> = {
  'Rosso Strada V12':      { hp: 390,  topSpeed: 290, z100: 5.3  },
  'Silverback Apex Coupe': { hp: 572,  topSpeed: 320, z100: 2.9  },
  'Inferno Wedge GT':      { hp: 492,  topSpeed: 325, z100: 4.1  },
  'Silver Arrow Gullwing': { hp: 215,  topSpeed: 260, z100: 8.8  },
  'Eclipse Hyperion':      { hp: 1479, topSpeed: 420, z100: 2.4  },
  'Crimson Ghost LM':      { hp: 471,  topSpeed: 324, z100: 3.8  },
  'Neon Wedge Raptor':     { hp: 455,  topSpeed: 295, z100: 4.7  },
  'Carrera Phantom RS':    { hp: 603,  topSpeed: 330, z100: 3.6  },
  'TriVector Falcon':      { hp: 627,  topSpeed: 386, z100: 3.2  },
  'Emerald Spear Roadster':{ hp: 265,  topSpeed: 240, z100: 6.9  },
  'Monarch Sterling GT':   { hp: 282,  topSpeed: 230, z100: 7.1  },
  'Le Mans Shadow MK1':    { hp: 485,  topSpeed: 330, z100: 4.3  },
  'Venom Coil Roadster':   { hp: 425,  topSpeed: 266, z100: 4.2  },
  'Stingblade V8 Coupe':   { hp: 495,  topSpeed: 312, z100: 3.0  },
  'Tokyo Storm Turbo':     { hp: 320,  topSpeed: 285, z100: 4.9  },
  'Zenith Pulse GT':       { hp: 290,  topSpeed: 270, z100: 5.7  },
  'Midnight Skyline R':    { hp: 276,  topSpeed: 250, z100: 5.6  },
  'Rotary Flame Coupe':    { hp: 276,  topSpeed: 250, z100: 5.3  },
  'Copper Fang V10':       { hp: 645,  topSpeed: 332, z100: 3.5  },
  'Bavaria Edge M1':       { hp: 273,  topSpeed: 262, z100: 5.6  },
  'Ghostline Sprint':      { hp: 350,  topSpeed: 282, z100: 4.7  },
  'Steel Time Coupe':      { hp: 130,  topSpeed: 209, z100: 10.5 },
  'Rosso Heritage 250':    { hp: 296,  topSpeed: 280, z100: 5.4  },
  'Atlantic Noir 57':      { hp: 200,  topSpeed: 200, z100: 10.0 },
  'Milano Scarlet 33':     { hp: 230,  topSpeed: 260, z100: 5.5  },
  'Bora Vento GT':         { hp: 310,  topSpeed: 280, z100: 6.5  },
  'Strato Rally Hawk':     { hp: 190,  topSpeed: 232, z100: 6.8  },
  'Aero King Daytona':     { hp: 425,  topSpeed: 240, z100: 5.5  },
  'Nordic Apex RS':        { hp: 1160, topSpeed: 420, z100: 2.8  },
  'Tempestia V12':         { hp: 740,  topSpeed: 355, z100: 3.1  },
}

async function main() {
  for (const [name, s] of Object.entries(STATS)) {
    const res = await prisma.item.updateMany({
      where: { name },
      data: { horsepower: s.hp, topSpeed: s.topSpeed, zeroToHundred: s.z100 },
    })
    console.log(`  ${res.count > 0 ? '✓' : '✗'} ${name}`)
  }
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
