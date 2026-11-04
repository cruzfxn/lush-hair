import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { configValidationSchema } from './config.schema';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { resolve } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      envFilePath: resolve(__dirname, '../../../.env'),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const synchronizeSetting = configService.get<string | boolean>('TYPEORM_SYNCHRONIZE');
        // Synchronize is for local development only. Create and run proper migrations before any launch.
        const synchronize = synchronizeSetting === undefined
          ? configService.get<string>('NODE_ENV') === 'development'
          : synchronizeSetting === true || synchronizeSetting === 'true';
        return {
          type: 'postgres' as const,
          ...(databaseUrl ? { url: databaseUrl } : {
            host: configService.get<string>('POSTGRES_HOST'),
            port: configService.get<number>('POSTGRES_PORT'),
            username: configService.get<string>('POSTGRES_USER'),
            password: configService.get<string>('POSTGRES_PASSWORD'),
            database: configService.get<string>('POSTGRES_DB'),
          }),
          ...(configService.get<boolean>('DATABASE_SSL') ? { ssl: { rejectUnauthorized: false } } : {}),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
        };
      },
    }),
    ProductsModule,
    UsersModule,
    AuthModule,
    CartModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
