import { useLocation, useNavigate } from "@solidjs/router";
import { Component, createMemo, createSignal, Show } from "solid-js";
import { useService } from "solid-services";
import Layout from "./Layout";
import { AuthService } from "./store/AuthService";
import Title from "./Title";
import { prevent } from "./utils/preventDefault";

const Register: Component = () => {

    const [errors, setErrors] = createSignal();

    const authService = useService(AuthService);
    const navigate = useNavigate();
    const location = useLocation<{ redirectTo?: string }>();

    createMemo(() => {
        if (authService().user) {
            navigate('/', { replace: true });
        }
    });

    const redirectTo = createMemo(() => {
        return location.state?.redirectTo || '/';
    });

    const submit = (e: { currentTarget: HTMLFormElement; }) => {
        const data = new FormData(e.currentTarget);
        const body = Object.fromEntries(data) as any;

        authService()
            .register(body)
            .then(() => {
                navigate(redirectTo());
            })
            .catch(setErrors);
    };

    return (
        <Layout>
            <Title value="Register" />
            <form onSubmit={prevent(submit)}>
                <fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-xs p-4 mx-auto">
                    <legend class="fieldset-legend">Register</legend>
                    <label class="floating-label">
                        <span>Username</span>
                        <input type="text" name="username" placeholder="Username" class="input input-md" />
                    </label>
                    <label class="floating-label">
                        <span>Password</span>
                        <input type="password" name="password" placeholder="Password" class="input input-md" />
                    </label>
                    <label class="floating-label">
                        <span>Password (Confirmation)</span>
                        <input type="password" name="password_confirmation" placeholder="Password (Confirmation)" class="input input-md" />
                    </label>
                    <label class="floating-label">
                        <span>Secret</span>
                        <input type="password" name="secret_code" placeholder="Secret Code" class="input input-md" />
                    </label>
                    <input type="submit" class="btn btn-primary" value="Register" />
                </fieldset>
            </form>
            <Show when={errors()}>
                {(errors) => <div>{JSON.stringify(errors)}</div>}
            </Show>

        </Layout>
    );
}

export default Register;
