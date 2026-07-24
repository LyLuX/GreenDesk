import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import BrandLogoService from '../service/brand-logo.service.js';
import BrandService from '../service/brand.service.js';
export default class BrandController {
  constructor(service = new BrandService(), logoService = new BrandLogoService()) {
    this.service = service;
    this.logoService = logoService;
  }
  async getAll(request, response) {
    response.json(successResponse(await this.service.getAll(request.query.search)));
  }
  async create(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.service.create(request.body, request.user.userId)));
  }
  async update(request, response) {
    response.json(
      successResponse(
        await this.service.update(request.params.uuid, request.body, request.user.userId),
      ),
    );
  }
  async remove(request, response) {
    await this.service.remove(request.params.uuid, request.user.userId);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
  async uploadLogo(request, response) {
    response.json(
      successResponse(
        await this.logoService.add(request.params.uuid, request.file, request.user.userId),
      ),
    );
  }
  async removeLogo(request, response) {
    response.json(
      successResponse(await this.logoService.remove(request.params.uuid, request.user.userId)),
    );
  }
  async logoContent(request, response) {
    const logo = await this.logoService.getForContent(request.params.uuid);
    response.type(logo.mimeType);
    response.setHeader('Content-Disposition', 'inline');
    response.sendFile(logo.filePath);
  }
}
