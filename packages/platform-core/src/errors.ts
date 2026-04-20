export class PlatformError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PlatformError';
    this.status = status;
  }
}
