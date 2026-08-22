import { successResponse } from '../../../core/responses/api-response.js';
import HistoryService from '../service/history.service.js';

/** Exposes consolidated, read-only domain histories. */
export default class HistoryController {
  constructor(historyService = new HistoryService()) {
    this.historyService = historyService;
  }

  async list(request, response) {
    response.json(
      successResponse(await this.historyService.list(request.params.section, request.query)),
    );
  }
}
