import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAtomValue } from "jotai";

import { UserInfo } from "@/core/types";
import { authenticationStateAtom } from "@/services/identity";
import { LanguageModel } from "@/services/web-api/types";
import { useWebApi } from "@/services/web-api/use-web-api";
import { convertWebApiRecord } from "@/utility/conversion";
import { InvalidOperationError } from "@/utility/errors";

const FALLBACK_RECOMMENDED_MODEL: LanguageModel = {
  name: "gpt-4o",
  size: "Large",
};

type InitState = "Initializing" | "Ready" | "Failed";

type ContextValue = {
  userInfo: [UserInfo, Dispatch<SetStateAction<UserInfo>>];
  initState: [InitState, Dispatch<SetStateAction<InitState>>];
};

type ProviderProps = { children: ReactNode };

const UserInfoContext = createContext<ContextValue | undefined>(undefined);

function UserInfoProvider({ children }: ProviderProps) {
  const webApi = useWebApi();
  const authenticationState = useAtomValue(authenticationStateAtom);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    username: "",
    modified: new Date().toISOString(),
    settings: {
      availableLlms: {
        models: [FALLBACK_RECOMMENDED_MODEL],
        recommended: FALLBACK_RECOMMENDED_MODEL.name,
      },
    },
  });
  const [initState, setInitState] = useState<InitState>("Initializing");

  const value: ContextValue = useMemo(
    () => ({
      userInfo: [userInfo, setUserInfo],
      initState: [initState, setInitState],
    }),
    [userInfo],
  );

  async function prefetch(abortSignal: AbortSignal) {
    const record = await webApi.user.getInfo(abortSignal);
    const userInfo = convertWebApiRecord.toUserInfo(record);

    setUserInfo(userInfo);
  }

  useEffect(() => {
    if (authenticationState === "Authenticated") {
      const controller = new AbortController();

      setInitState("Initializing");
      prefetch(controller.signal)
        .then(() => setInitState("Ready"))
        .catch(() => setInitState("Failed"));

      return () => controller.abort();
    }

    return;
  }, [authenticationState]);

  return (
    <UserInfoContext.Provider value={value}>
      {children}
    </UserInfoContext.Provider>
  );
}

function useCurrentUser() {
  const context = use(UserInfoContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useUserInfo must be used within a UserInfoProvider",
    );
  }

  const webApi = useWebApi();
  const [userInfo, setUserInfo] = context.userInfo;
  const [initState] = context.initState;

  /**
   * Updates the user's default note type and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function setDefaultNoteType(id: string) {
    const modified = new Date().toISOString();

    setUserInfo((userInfo) => ({
      ...userInfo,
      settings: { ...userInfo.settings, defaultNoteType: id },
      modified,
    }));

    webApi.user.setDefaultNoteType(id);
  }

  /**
   * Updates the user's currently enabled note types and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function setEnabledNoteTypes(noteTypes: string[]) {
    const modified = new Date().toISOString();

    setUserInfo((userInfo) => ({
      ...userInfo,
      settings: { ...userInfo.settings, enabledNoteTypes: noteTypes },
      modified,
    }));

    webApi.user.setEnabledNoteTypes(noteTypes);
  }

  return {
    initState,
    username: userInfo.username,
    settings: userInfo.settings,
    setDefaultNoteType,
    setEnabledNoteTypes,
  };
}

function useRawUserInfoState() {
  const context = use(UserInfoContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useUserInfo must be used within a UserInfoProvider",
    );
  }

  const [userInfo, setUserInfo] = context.userInfo;
  const [initState] = context.initState;

  return {
    initState,
    value: userInfo,
    setValue: setUserInfo,
  };
}

export {
  UserInfoProvider,
  useCurrentUser,
  useRawUserInfoState,
  FALLBACK_RECOMMENDED_MODEL,
};
