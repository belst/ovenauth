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

  const submit = (e) => {
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
        <input type="submit" class="float-right btn btn-primary" value="Login" />
      </form>
      <Show when={errors()}>
        {(errors) => <div>{JSON.stringify(errors)}</div>}
      </Show>
    </Layout>
  );
};

export default Login;
