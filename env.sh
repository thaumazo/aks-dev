export PULUMI_CONFIG_PASSPHRASE=
export GITHUB_OWNER=thaumazo

az login && \
    pulumi login azblob://iac?storage_account=thaumazodev || exit 1

echo "Successfully logged in to azure and pulumi! Run 'pulumi up' to update based on current code."

