const BASE_URL = "https://api.bitbucket.org/2.0";

type GetRepositoryResponse = {
    uuid: string;
};

export class BitBucketClient {
    public constructor(private accessToken: string) {}

    public async getRepositoryUuid(workspace: string, repoSlug: string): Promise<string> {
        const response = await fetch(`${BASE_URL}/repositories/${workspace}/${repoSlug}`, {
            headers: {
                authorization: `Bearer ${this.accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch repository");
        }

        const body = (await response.json()) as GetRepositoryResponse;
        return body.uuid;
    }
}
