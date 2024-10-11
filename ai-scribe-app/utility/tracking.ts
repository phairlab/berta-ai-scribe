import { ApplicationError } from "./errors";

export type TrackedState =
  | "Not Persisted" // Newly created and not persisted outside the current session.
  | "Persisting" // Performing initial save.
  | "Locally Modified" // Local changes that have not been persisted.
  | "Synchronizing" // Updating the persisted version.
  | "Synchronized"; // Local version matches persisted version.

// Normal flow:
//  Initial Save: "Not Persisted" => "Persisting" => "Synchronized"
//  Subsequent Save: "Synchronized" => "Synchronizing" => "Synchronized"

export type WithTracking<T> = T & {
  tracking: {
    /** The current tracking state of this {@link WithTracking<T>} */
    state: TrackedState;

    /**
     * Whether this tracked object is persisted, meaning there is
     * a stored version of it that will persist past the current
     * session.
     */
    isPersisted: boolean;

    /**
     * Whether this tracked object is saved, meaning it has
     * been persisted and is not marked as modified or being saved.
     */
    isSaved: boolean;

    /**
     * Whether this tracked object's persisted record is being
     * updated.
     */
    isSaving: boolean;

    /**
     * Whether the last attempt to update this object's persisted
     * record failed and generated an error.
     */
    hasError: boolean;

    /**
     * The error (if any) that occurred on the last attempt to
     * update this object's persisted record.
     */
    error: ApplicationError | undefined;
  };
};

/** Returns true if the state is one of the indicated list. */
function isState(state: TrackedState, checkStates: TrackedState[]) {
  return checkStates.some((checkState) => checkState === state);
}

/**
 * Returns a new object composed of the provided entity's fields
 * along with the specified tracking state.
 */
export function setTracking<T>(
  entity: T | WithTracking<T>,
  state: TrackedState,
  error?: ApplicationError,
): WithTracking<T> {
  return {
    ...entity,
    tracking: {
      state: state,
      isSaved: isState(state, ["Synchronized"]),
      isSaving: isState(state, ["Persisting", "Synchronizing"]),
      isPersisted: !isState(state, ["Not Persisted", "Persisting"]),
      hasError: error !== undefined,
      error: error,
    },
  };
}
