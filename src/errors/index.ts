export abstract class CtmError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

export class TemplateNotFoundError extends CtmError {
  constructor(templateName: string, details?: Record<string, unknown>) {
    super(`Template "${templateName}" not found`, 'TEMPLATE_NOT_FOUND', {
      templateName,
      ...details
    });
  }
}

export class TemplateAlreadyExistsError extends CtmError {
  constructor(templateName: string, details?: Record<string, unknown>) {
    super(`Template "${templateName}" already exists`, 'TEMPLATE_ALREADY_EXISTS', {
      templateName,
      ...details
    });
  }
}

export class TemplateVersionNotFoundError extends CtmError {
  constructor(templateName: string, version: string, details?: Record<string, unknown>) {
    super(
      `Version "${version}" not found for template "${templateName}"`,
      'TEMPLATE_VERSION_NOT_FOUND',
      { templateName, version, ...details }
    );
  }
}

export class TemplateVersionAlreadyExistsError extends CtmError {
  constructor(templateName: string, version: string, details?: Record<string, unknown>) {
    super(
      `Version "${version}" already exists for template "${templateName}"`,
      'TEMPLATE_VERSION_ALREADY_EXISTS',
      { templateName, version, ...details }
    );
  }
}

export class InvalidVersionTagError extends CtmError {
  constructor(version: string, details?: Record<string, unknown>) {
    super(
      `Invalid version format "${version}". Use semver format (e.g., v1.0.0 or 1.0.0)`,
      'INVALID_VERSION_TAG',
      { version, ...details }
    );
  }
}

export class InvalidRepoUrlError extends CtmError {
  constructor(url: string, details?: Record<string, unknown>) {
    super(`Invalid repository URL format: ${url}`, 'INVALID_REPO_URL', { url, ...details });
  }
}

export class ConfigNotFoundError extends CtmError {
  constructor(key: string, details?: Record<string, unknown>) {
    super(`Config key "${key}" not found`, 'CONFIG_NOT_FOUND', { key, ...details });
  }
}

export class ConfigCorruptedError extends CtmError {
  constructor(filePath: string, error?: string, details?: Record<string, unknown>) {
    super(
      `Config file is corrupted: ${filePath}${error ? ` - ${error}` : ''}`,
      'CONFIG_CORRUPTED',
      { filePath, error, ...details }
    );
  }
}

export class ConfigInvalidValueError extends CtmError {
  constructor(key: string, value: string, reason: string, details?: Record<string, unknown>) {
    super(`Invalid value "${value}" for config key "${key}": ${reason}`, 'CONFIG_INVALID_VALUE', {
      key,
      value,
      reason,
      ...details
    });
  }
}

export class NetworkError extends CtmError {
  constructor(url: string, error: string, details?: Record<string, unknown>) {
    super(`Network error accessing ${url}: ${error}`, 'NETWORK_ERROR', { url, error, ...details });
  }
}

export class GitNotInstalledError extends CtmError {
  constructor(details?: Record<string, unknown>) {
    super('Git is not installed. Please install Git first.', 'GIT_NOT_INSTALLED', details);
  }
}

export class CloneError extends CtmError {
  constructor(repo: string, error: string, details?: Record<string, unknown>) {
    super(`Failed to clone repository "${repo}": ${error}`, 'CLONE_ERROR', {
      repo,
      error,
      ...details
    });
  }
}

export class DirectoryConflictError extends CtmError {
  constructor(dirPath: string, reason: string, details?: Record<string, unknown>) {
    super(`Directory conflict at "${dirPath}": ${reason}`, 'DIRECTORY_CONFLICT', {
      dirPath,
      reason,
      ...details
    });
  }
}

export class StorageError extends CtmError {
  constructor(operation: string, error: string, details?: Record<string, unknown>) {
    super(`Storage error during ${operation}: ${error}`, 'STORAGE_ERROR', {
      operation,
      error,
      ...details
    });
  }
}

export class StorageNotInitializedError extends CtmError {
  constructor(details?: Record<string, unknown>) {
    super('Storage adapter is not initialized', 'STORAGE_NOT_INITIALIZED', details);
  }
}

export class VariableNotFoundError extends CtmError {
  constructor(variableName: string, details?: Record<string, unknown>) {
    super(`Required variable "${variableName}" not provided`, 'VARIABLE_NOT_FOUND', {
      variableName,
      ...details
    });
  }
}

export class SearchError extends CtmError {
  constructor(query: string, error: string, details?: Record<string, unknown>) {
    super(`Search failed for "${query}": ${error}`, 'SEARCH_ERROR', { query, error, ...details });
  }
}

export class ValidationError extends CtmError {
  constructor(field: string, message: string, details?: Record<string, unknown>) {
    super(`Validation error for "${field}": ${message}`, 'VALIDATION_ERROR', {
      field,
      message,
      ...details
    });
  }
}

export type ErrorCode =
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_ALREADY_EXISTS'
  | 'TEMPLATE_VERSION_NOT_FOUND'
  | 'TEMPLATE_VERSION_ALREADY_EXISTS'
  | 'INVALID_VERSION_TAG'
  | 'INVALID_REPO_URL'
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_CORRUPTED'
  | 'CONFIG_INVALID_VALUE'
  | 'NETWORK_ERROR'
  | 'GIT_NOT_INSTALLED'
  | 'CLONE_ERROR'
  | 'DIRECTORY_CONFLICT'
  | 'STORAGE_ERROR'
  | 'STORAGE_NOT_INITIALIZED'
  | 'VARIABLE_NOT_FOUND'
  | 'SEARCH_ERROR'
  | 'VALIDATION_ERROR'
  | 'OPERATION_ERROR';

export class OperationError extends CtmError {
  constructor(
    message: string,
    code: string = 'OPERATION_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'OperationError';
  }
}
