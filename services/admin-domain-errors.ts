export class AdminValidationError extends Error {
  constructor(message: string) { super(message); this.name = "AdminValidationError"; }
}

export class AdminConflictError extends Error {
  constructor(message: string) { super(message); this.name = "AdminConflictError"; }
}

export class AdminNotFoundError extends Error {
  constructor(message: string) { super(message); this.name = "AdminNotFoundError"; }
}

export class ProvisioningError extends Error {
  constructor(message = "Unable to provision the employee account") { super(message); this.name = "ProvisioningError"; }
}
