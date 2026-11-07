import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { EventsModule } from './events/events.module';

// En producción (Render, etc.) la conexión viene en DATABASE_URL.
// En local, si no existe, se usa el PostgreSQL de tu computador.
const databaseUrl = process.env.DATABASE_URL;

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(databaseUrl
        ? {
            url: databaseUrl,
            ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
          }
        : {
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'crud_db',
          }),
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    EventsModule,
  ],
})
export class AppModule {}
