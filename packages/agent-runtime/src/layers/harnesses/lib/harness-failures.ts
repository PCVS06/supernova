/** A harness that cannot run as configured. Workflow steps record these as `configuration` failures, never as provider errors. */
export class HarnessConfigurationFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "HarnessConfigurationFailure";
  }
}
