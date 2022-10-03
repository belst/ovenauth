import { useLocation, useNavigate } from "solid-app-router";
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
        if (authService().user != null && authService().user.id != 0) {
            navigate('/', { replace: true });
        }
    });

    const redirectTo = createMemo(() => {
        return location.state?.redirectTo || '/';
    });

    const submit = (e) => {
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
                <div class="form-control">
                    <label class="label">
                        <span class="label-text">Username</span>
                    </label>
                    <input type="text" name="username" placeholder="Username" class="input input-bordered" />
                </div>
                <div class="form-control">
                    <label class="label">
                        <span class="label-text">Password</span>
                    </label>
                    <input type="password" name="password" placeholder="Password" class="input input-bordered" />
                </div>
                <div class="form-control">
                    <label class="label">
                        <span class="label-text">Password (Confirmation)</span>
                    </label>
                    <input type="password" name="password_confirmation" placeholder="Password" class="input input-bordered" />
                </div>
                <div class="form-control">
                    <label class="label">
                        <span class="label-text">Secret</span>
                    </label>
                    <input type="password" name="secret_code" placeholder="Secret Code" class="input input-bordered" />
                </div>
                <input type="submit" class="float-right btn btn-primary" value="Register" />
            </form>
            <Show when={errors()}>
                {(errors) => <div>{JSON.stringify(errors)}</div>}
            </Show>

        </Layout>
    );
}

export default Register;