import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DATABASE_CONNECTION } from 'src/database/database-connection';
import * as schema from './schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateUserRequest } from './dto/create-user.request';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    let adminRole = await this.database.query.roles.findFirst({
      where: eq(schema.roles.name, 'admin'),
    });

    if (!adminRole) {
      const [newRole] = await this.database
        .insert(schema.roles)
        .values({ name: 'admin' })
        .returning();
      adminRole = newRole;
      console.log("Default 'admin' role created.");
    }

    const adminUser = await this.database.query.users.findFirst({
      where: eq(schema.users.roleId, adminRole.id),
    });

    if (!adminUser) {
      const adminPassword =
        this.configService.get<string>('ADMIN_PASSWORD') ?? '12345678';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await this.database.insert(schema.users).values({
        email: 'admin@gmail.com',
        password: hashedPassword,
        roleId: adminRole.id,
      });
      console.log('Default admin user created: admin@gmail.com');
    }

    const userRole = await this.database.query.roles.findFirst({
      where: eq(schema.roles.name, 'user'),
    });
    if (!userRole) {
      await this.database
        .insert(schema.roles)
        .values({ name: 'user' })
        .execute();
      console.log("Default 'user' role created.");
    }
  }

  async getUsers() {
    return this.database.query.users.findMany({
      columns: {
        id: true,
        email: true,
        timestamp: true,
      },
      with: {
        role: {
          columns: {
            name: true,
          },
        },
      },
    });
  }

  async createUser(request: CreateUserRequest) {
    const userRole = await this.database.query.roles.findFirst({
      where: eq(schema.roles.name, 'user'),
    });

    if (!userRole) {
      throw new Error("Default 'user' role not found.");
    }

    const hashedPassword = await bcrypt.hash(request.password, 10);

    const newUser: typeof schema.users.$inferInsert = {
      email: request.email,
      password: hashedPassword,
      roleId: userRole.id,
    };

    await this.database.insert(schema.users).values(newUser);
  }
}
