import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'npm_package_name') return 'test-app-name';
      if (key === 'npm_package_version') return '1.0.0';
      return null;
    }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('dummy', () => {
    it('should return a dummy API response', () => {
      const response = appController.getDummy();
      expect(response).toHaveProperty('status', 'success');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
    });
  });

  describe('version', () => {
    it('should return application name and version', () => {
      const response = appController.getVersion();
      expect(response).toEqual({
        name: 'test-app-name',
        version: '1.0.0',
      });
    });
  });
});