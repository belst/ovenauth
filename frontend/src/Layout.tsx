import { Component } from "solid-js";

const Layout: Component = (props) => {
    return (
        <div class="container mx-auto">
            {props.children}
        </div>
    );
}

export default Layout;