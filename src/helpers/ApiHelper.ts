import {CustomError} from "../models/Errors";

const attemptCounters: {[key: string]: number} = {};

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function limitAttempts(taskId: string, maxAttempts: number = 20, message: string = ""): boolean {
    if (!attemptCounters.hasOwnProperty(taskId)) {
        attemptCounters[taskId] = maxAttempts;
    }

    if (attemptCounters[taskId]-- > 0) {
        return true;
    }

    delete attemptCounters[taskId];
    throw new Error(`Task ${taskId} failed after ${maxAttempts} attempts. ${message}`);
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