import { useCurrentWorkspaceAndApplication } from '@/hooks/useCurrentWorkspaceAndApplication';
import { ApplicationStatus } from '@/types/application';
import type {
  GetApplicationStateQuery,
  GetApplicationStateQueryVariables,
} from '@/utils/__generated__/graphql';
import { useGetApplicationStateQuery } from '@/utils/__generated__/graphql';
import type { QueryHookOptions } from '@apollo/client';
import { useEffect } from 'react';

export interface UseProjectRedirectWhenReadyOptions
  extends QueryHookOptions<
    GetApplicationStateQuery,
    GetApplicationStateQueryVariables
  > {}

export default function useProjectRedirectWhenReady(
  options: UseProjectRedirectWhenReadyOptions = {},
) {
  const { currentApplication } = useCurrentWorkspaceAndApplication();
  const { data, client, startPolling, ...rest } = useGetApplicationStateQuery({
    ...options,
    variables: { ...options.variables, appId: currentApplication.id },
  });

  useEffect(() => {
    startPolling(options.pollInterval || 2000);
  }, [options.pollInterval, startPolling]);

  useEffect(() => {
    async function updateOwnCache() {
      await client.refetchQueries({
        include: ['getOneUser'],
      });
    }

    if (!data) {
      return;
    }

    if (data.app.appStates.length === 0) {
      return;
    }

    const [lastState] = [...data.app.appStates].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (
      lastState.stateId === ApplicationStatus.Live ||
      lastState.stateId === ApplicationStatus.Errored
    ) {
      // Will update the cache and update with the new application state
      // which will trigger the correct application component
      // under `src\components\applications\App.tsx`
      updateOwnCache();
    }
  }, [data, client]);

  return { data, client, ...rest };
}
