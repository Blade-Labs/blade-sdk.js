import {CustomError} from "../models/Errors";

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function statusCheck(res: Response): Promise<Response> {
    if (!res.ok) {
        let error: string | CustomError = await res.text();
        try {
            error = JSON.parse(error) as CustomError;
            error._code = res.status;
            error._url = res.url;
        } catch (e) {
            error = `${res.status} (${res.url}): ${error}`;
        }
        throw error;
    }
    return res;
}

export async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
    return new Promise((resolve, reject) => {
        let attemptCounter = 0;

        const interval = 5000;
        const makeRequest = () => {
            attemptCounter++;
            fetch(url, options)
                .then(async res => {
                    if (!res.ok) {
                        // Request timeout check
                        if (
                            // TODO add some options for fetchWithRetry to handle it or not
                            // (res.status === 408 || res.status === 429) &&
                            attemptCounter < maxAttempts
                        ) {
                            setTimeout(() => {
                                makeRequest();
                            }, interval * attemptCounter);
                        } else {
                            let error: CustomError | string = await res.text();
                            try {
                                error = JSON.parse(error) as CustomError;
                                error._code = res.status;
                                error._url = res.url;
                            } catch (e) {
                                error = `${res.status} (${res.url}): ${error}`;
                            }
                            reject(error);
                        }
                    } else {
                        resolve(res);
                    }
                })
                .catch((e: Error) => {
                    reject({
                        url,
                        error: e.message
                    });
                });
        };
        makeRequest();
    });
}