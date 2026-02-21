import { Component, createMemo, createSignal, Show } from "solid-js";
import { useService } from "solid-services";
import { AuthService } from "./store/AuthService";
import { prevent } from "./utils/preventDefault";
import { useLocation, useNavigate } from "@solidjs/router";
import Layout from "./Layout";
import Title from "./Title";


const Login: Component = () => {
  const [errors, setErrors] = createSignal<Error | Record<string, string[]>>();
  const authService = useService(AuthService);
  const location = useLocation<{ redirectTo?: string }>();
  const navigate = useNavigate();

  createMemo(() => {
    if (authService().user) {
      navigate('/', { replace: true });
    }
  })

  const redirectTo = createMemo(() => {
    return location.state?.redirectTo || '/';
  });

  const submit = (e: { currentTarget: HTMLFormElement; }) => {
    const data = new FormData(e.currentTarget);
    const body = Object.fromEntries(data) as any;

    authService()
      .login(body)
      .then(() => {
        navigate(redirectTo());
      })
      .catch(setErrors)
  }

  return (
    <Layout>
      <Title value="Login" />
      <form onSubmit={prevent(submit)}>
        <fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-xs p-4 mx-auto">
          <legend class="fieldset-legend">Login</legend>

          <label class="floating-label">
            <input class="input" name="username" type="text" placeholder="Username" />
            <span class="label">Username</span>
          </label>


          <label class="floating-label">
            <input class="input" name="password" type="password" placeholder="Password" />
            <span class="label">Password</span>
          </label>

          <button class="btn btn-neutral mt-4">Login</button>
        </fieldset>
      </form>
      <Show when={errors()}>
        {(errors) => <div>{JSON.stringify(errors)}</div>}
      </Show>
    </Layout>
  );
};

export default Login;
