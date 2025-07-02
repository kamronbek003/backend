import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, 
    transform: true, 
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  const config = new DocumentBuilder()
    .setTitle('EDUNEX API')
    .setDescription('EDUNEX uchun API dokumentatsiyasi') 
    .setVersion('4.0') 
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, { 
    swaggerOptions: {
      persistAuthorization: true, 
    },
  });

  app.enableCors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, "0.0.0.0",  () => {
    console.log(`Server is running on port ${port}`);
  });
}
bootstrap();
