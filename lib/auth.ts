import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { AUTH_LOGIN_URL, AUTH_REFRESH_TOKEN_URL, LOGIN_URL } from "./constants/auth";
import bkFetch from "@/services/backend.services";


const BASE_URL = process.env.API_BASE_URL;

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            id: "ccd2024",
            name: "ccd2024",
            credentials: {
                username: {
                    label: "Username",
                    type: "text",
                    placeholder: "example",
                },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const authResponse = await bkFetch(`${BASE_URL}${AUTH_LOGIN_URL}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(credentials),
                })

                if (!authResponse.ok) {
                    const data = await authResponse.text();
                    return null
                }

                const user = await authResponse.json()

                if (user?.access) {
                    return Promise.resolve(user)
                } else {
                    return Promise.resolve(null)
                }
            },
        }),
    ],
    callbacks: {
        jwt: async ({ token, user, session, trigger, account, profile, isNewUser }) => {
            if (trigger === "update") {
                const response = await bkFetch("/auth/user/", {
                    method: "GET"
                });
                token.user = await response.json();
            }
            if (user) {
                token.access = user.access;
                token.refresh = user.refresh;
                token.expires_at = (new Date().getTime() + 24 * 60 * 60 * 1000) - (300 * 1000);
                token.user = user.user;
                return token;
            } else if (Date.now() > token.expires_at) {
                const BASE_URL = process.env.API_BASE_URL;
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                };
                const response = await bkFetch(`${BASE_URL}${AUTH_REFRESH_TOKEN_URL}`, {
                    headers,
                    method: "POST",
                    body: JSON.stringify({
                        refresh: token.refresh
                    }),
                });

                const data = await response.json();
                token.access = data.access;
                token.expires_at = new Date(data.access_expiration).getTime() - (300 * 1000);
            }
            return token;
        },
        session: async ({ session, token }) => {
            session.user = token.user;
            session.access = token.access;
            session.error = token.error;
            return session;
        },
        redirect: async ({ url, baseUrl }) => {
            return '<redirect url> goes here'
        }
    },
    pages: {
        signIn: LOGIN_URL,
        signOut: LOGIN_URL,
        error: LOGIN_URL, // Error code passed in query string as ?error=
        verifyRequest: LOGIN_URL, // (used for check email message)
        newUser: LOGIN_URL // New users will be directed here on first sign in (leave the property out if not of interest)
    }
};
