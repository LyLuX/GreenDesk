import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import CompanyLogoService from '../service/company-logo.service.js';
import CompanyService from '../service/company.service.js';

export default class CompanyController {
  constructor(service = new CompanyService(), logoService = new CompanyLogoService()) {
    this.service = service;
    this.logoService = logoService;
  }
  async getAll(request, response) {
    response.json(successResponse(await this.service.getAll(request.query, request.user)));
  }
  async getByUuid(request, response) {
    response.json(successResponse(await this.service.getByUuid(request.params.uuid, request.user)));
  }
  async create(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(
        successResponse(await this.service.create(request.body, request.user.userId, request.user)),
      );
  }
  async update(request, response) {
    response.json(
      successResponse(
        await this.service.update(
          request.params.uuid,
          request.body,
          request.user.userId,
          request.user,
        ),
      ),
    );
  }
  async remove(request, response) {
    await this.service.remove(request.params.uuid, request.user.userId, request.user);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
  async restore(request, response) {
    response.json(
      successResponse(
        await this.service.restore(request.params.uuid, request.user.userId, request.user),
      ),
    );
  }
  async uploadLogo(request, response) {
    response.json(
      successResponse(
        await this.logoService.add(
          request.params.uuid,
          request.file,
          request.user.userId,
          request.user,
        ),
      ),
    );
  }
  async removeLogo(request, response) {
    response.json(
      successResponse(
        await this.logoService.remove(request.params.uuid, request.user.userId, request.user),
      ),
    );
  }
  async logoContent(request, response) {
    const logo = await this.logoService.getForContent(request.params.uuid, request.user);
    response.type(logo.mimeType);
    response.setHeader('Content-Disposition', 'inline');
    response.sendFile(logo.filePath);
  }
}
