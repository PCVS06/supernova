import {useState} from "react";
import type {Provider} from "@supernova/contracts/providers/schemas";
import Dialog from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import ProviderConnectMethodContent from "@/features/settings/components/providers/provider-connect-method-content";
import ProviderRow from "@/features/settings/components/providers/provider-row";
import ProviderLoginContent from "@/features/settings/components/providers/provider-login-content";
import ProvidersSkeleton from "@/features/settings/components/providers/providers-skeleton";
import ToolCredentialsEditor from "@/features/settings/components/providers/tool-credentials-editor";
import {SettingsGroup, SettingsNote} from "@/features/settings/components/settings-group";
import {useListProviders} from "@/features/settings/hooks/api/providers/use-list-providers";
import {useLogoutProvider} from "@/features/settings/hooks/api/providers/use-logout-provider";
import {useProviderConnectFlow} from "@/features/settings/hooks/providers/use-provider-connect-flow";

export default function ProvidersSection() {
  const providersQuery = useListProviders();
  const logoutMutation = useLogoutProvider();
  const connectFlow = useProviderConnectFlow({
    onLoginDialogClosed: () => {
      void providersQuery.refetch();
    },
  });
  const [search, setSearch] = useState("");

  const handleDisconnect = async (provider: Provider): Promise<void> => {
    await logoutMutation.mutateAsync({providerId: provider.id});
  };

  const searchQuery = search.trim().toLowerCase();
  // Search narrows only the catalogue: the providers you already use stay in view.
  const connectedProviders = providersQuery.data?.filter((provider) => provider.connected) ?? [];
  const allOtherProviders = providersQuery.data?.filter((provider) => !provider.connected) ?? [];
  const otherProviders = allOtherProviders.filter((provider) => provider.name.toLowerCase().includes(searchQuery));

  return (
    <>
      {providersQuery.isPending && <ProvidersSkeleton />}
      {providersQuery.error && <p className="px-1 text-sm text-danger-ink">Unable to load providers.</p>}
      {providersQuery.data && (
        <>
          <SettingsGroup description="Their models appear in every model picker." title="Connected providers">
            {connectedProviders.map((provider) => (
              <ProviderRow key={provider.id} onConnect={connectFlow.connect} onDisconnect={handleDisconnect} provider={provider} />
            ))}
            {!connectedProviders.length && <SettingsNote>No provider connected yet. Add one below to start chatting.</SettingsNote>}
          </SettingsGroup>

          <SettingsGroup description="Saved as soon as you enter them, and used by every harness." title="Tool keys">
            <ToolCredentialsEditor />
          </SettingsGroup>

          <SettingsGroup
            collapsible
            defaultOpen={connectedProviders.length === 0}
            description={`${allOtherProviders.length} more providers you can sign in to`}
            title="Add a provider"
          >
            <div className="px-4 py-3">
              <Input aria-label="Search providers" placeholder="Search providers…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            {otherProviders.map((provider) => (
              <ProviderRow key={provider.id} onConnect={connectFlow.connect} onDisconnect={handleDisconnect} provider={provider} />
            ))}
            {!otherProviders.length && <SettingsNote>No provider matches your search.</SettingsNote>}
          </SettingsGroup>

          <Dialog
            containerClassName="h-auto w-[min(calc(100vw-1rem),32rem)]"
            onOpenChange={(open) => {
              if (!open) connectFlow.closeDialog();
            }}
            onOpenChangeComplete={connectFlow.handleDialogOpenChangeComplete}
            open={connectFlow.dialogOpen}
            title={`Connect ${connectFlow.selectedProvider?.name ?? "provider"}`}
          >
            {connectFlow.view === "method" && <ProviderConnectMethodContent onSelect={connectFlow.chooseMethod} pendingMethod={connectFlow.pendingAuthType} />}
            {connectFlow.view === "login" && connectFlow.startLoginError && <p className="pb-4 pt-1 text-sm text-danger-ink">{connectFlow.startLoginError.message}</p>}
            {connectFlow.view === "login" && !connectFlow.startLoginError && (
              <ProviderLoginContent
                initialSession={connectFlow.loginSession}
                key={connectFlow.loginSessionId}
                loginSessionId={connectFlow.loginSessionId}
                onClose={connectFlow.closeDialog}
              />
            )}
          </Dialog>
        </>
      )}
    </>
  );
}
