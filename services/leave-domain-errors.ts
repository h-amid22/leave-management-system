export class LeaveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeaveValidationError";
  }
}

export class LeaveRequestNotFoundError extends Error {
  constructor() {
    super("Leave request not found");
    this.name = "LeaveRequestNotFoundError";
  }
}

export class LeaveBalanceNotFoundError extends Error {
  constructor() {
    super("Leave balance not found for the requested year and leave type");
    this.name = "LeaveBalanceNotFoundError";
  }
}

export class LeavePolicyNotFoundError extends Error {
  constructor() {
    super("No effective leave policy exists for the requested dates");
    this.name = "LeavePolicyNotFoundError";
  }
}

export class InsufficientLeaveBalanceError extends Error {
  constructor() {
    super("Insufficient leave balance");
    this.name = "InsufficientLeaveBalanceError";
  }
}

export class LeaveRequestConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeaveRequestConflictError";
  }
}
