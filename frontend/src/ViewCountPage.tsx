import { useParams } from "@solidjs/router";
import ViewCount from "./ViewCount";

const ViewCountPage = () => {

    const params = useParams();

    return (
        <div class="w-full h-screen grid place-items-center">
            <ViewCount interval={10000} name={params.user}></ViewCount>
        </div>
    );
}

export default ViewCountPage;
