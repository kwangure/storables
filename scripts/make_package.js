const { user, _updating } = delayable({
    name: "user",
    async start(set) {
        const response = await fetch("/user");
        set(response.json());
    },
});
