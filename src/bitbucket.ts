const BASE_URL = "https://api.bitbucket.org/2.0";

type GetRepositoryResponse = {
    uuid: string;
};

export class BitBucketClient {
    public constructor(
        private readonly accessToken: string,
        private readonly workspace: string,
        private readonly repoSlug: string,
    ) {}

    public async getRepositoryUuid(): Promise<string> {
        const response = await fetch(
            `${BASE_URL}/repositories/${this.workspace}/${this.repoSlug}`,
            {
                headers: {
                    authorization: `Bearer ${this.accessToken}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error("Failed to fetch repository");
        }

        const body = (await response.json()) as GetRepositoryResponse;
        return body.uuid;
    }

    public async enablePipeline(): Promise<void> {
        const response = await fetch(
            `${BASE_URL}/repositories/${this.workspace}/${this.repoSlug}/pipelines_config`,
            {
                method: "PUT",
                headers: {
                    authorization: `Bearer ${this.accessToken}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    enabled: true,
                }),
            },
        );

        if (!response.ok) {
            throw new Error("Failed to enable pipeline");
        }
    }
}
