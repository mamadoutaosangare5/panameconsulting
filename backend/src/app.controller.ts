import { Controller, Get, Redirect, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import express from 'express';

@ApiTags('App')
@Controller()
export class AppController {
  constructor() {}

  // @Get() - Supprimé pour permettre au catch-all de servir le frontend
  // @ApiOperation({ summary: "Page d'accueil de l'API" })
  // @ApiResponse({ status: 200, description: 'Message de bienvenue' })
  // getRoot(): string {
  //   return 'Bonjour à Vous';
  // }

  @Public()
  @Get('api')
  @ApiOperation({ summary: "Liste des modules de l'API" })
  @ApiResponse({ status: 200, description: 'Liste des modules' })
  getApiModules(): object {
    return {
      success: true,
      message: "Modules de l'API Paname Consulting",
      data: {
        name: 'Paname Consulting API',
        version: 'v1',
        modules: [
          {
            name: 'Authentication',
            path: '/auth',
            description: "Gestion de l'authentification",
            endpoints: [
              'POST /auth/register',
              'POST /auth/login',
              'POST /auth/logout',
              'POST /auth/refresh',
              'GET /user/profile',
            ],
          },
          {
            name: 'Users',
            path: '/users',
            description: 'Gestion des utilisateurs',
            endpoints: [
              'GET /admin/users/all',
              'GET /user/profile',
              'PATCH /admin/user/:id',
            ],
          },
          {
            name: 'Rendezvous',
            path: '/rendezvous',
            description: 'Gestion des rendez-vous',
            endpoints: [
              'POST /rendezvous',
              'GET /rendezvous/slots',
              'GET /admin/rendezvous/all',
            ],
          },
          {
            name: 'Procedures',
            path: '/procedures',
            description: 'Gestion des procédures',
            endpoints: [
              'POST /admin/procedures/create',
              'GET /admin/procedures/all',
              'GET /procedures/:id/details',
            ],
          },
          {
            name: 'Contacts',
            path: '/contacts',
            description: 'Gestion des messages',
            endpoints: [
              'POST /contacts',
              'GET /admin/contacts/all',
              'PATCH /admin/contacts/:id/respond',
            ],
          },
        ],
        documentation: '/docs',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }

  @Get('version')
  @Public()
  @ApiOperation({ summary: "Version de l'API" })
  getVersion() {
    return {
      success: true,
      data: {
        name: 'Paname Consulting Backend',
        node: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('debug/headers')
  @Public()
  @ApiExcludeEndpoint()
  debugHeaders(@Req() req: express.Request) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        message: 'Not available in production',
        statusCode: 403,
      };
    }
    return {
      success: true,
      data: {
        headers: req.headers,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('docs')
  @Redirect('/docs', 302)
  redirectToDocs() {
    return { url: '/docs' };
  }
}
