import {PrismaPg} from '@prisma/adapter-pg'
import {PrismaClient} from '../generated/prisma/client.ts'
import {config} from '../config'

const adapter = new PrismaPg({connectionString: config.DATABASE_URL})

export const prisma = new PrismaClient({adapter})
