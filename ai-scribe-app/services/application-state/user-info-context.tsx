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

import { UserInfo } from "@/core/types";
import { useSession } from "@/services/session-management/use-session";
import { useWebApi } from "@/services/web-api/use-web-api";
import { convertWebApiRecord } from "@/utility/conversion";
import { InvalidOperationError } from "@/utility/errors";

type InitState = "Initializing" | "Ready" | "Failed";

type ContextValue = {
  userInfo: [UserInfo, Dispatch<SetStateAction<UserInfo>>];
  initState: [InitState, Dispatch<SetStateAction<InitState>>];
};

type ProviderProps = { children: ReactNode };

const UserInfoContext = createContext<ContextValue | undefined>(undefined);

function UserInfoProvider({ children }: ProviderProps) {
  const webApi = useWebApi();
  const session = useSession();

  const [userInfo, setUserInfo] = useState<UserInfo>({
    username: "",
    modified: new Date().toISOString(),
    settings: {},
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
    if (session.state === "Authenticated") {
      const controller = new AbortController();

      setInitState("Initializing");
      prefetch(controller.signal)
        .then(() => setInitState("Ready"))
        .catch(() => setInitState("Failed"));

      return () => controller.abort();
    }

    return;
  }, [session]);

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

  return {
    initState,
    username: userInfo.username,
    settings: userInfo.settings,
    setDefaultNoteType,
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

export { UserInfoProvider, useCurrentUser, useRawUserInfoState };
