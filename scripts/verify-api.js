async function testAPI() {
    try {
        console.log("Fetching API without cookies (should Fail 401/403)...");
        const res = await fetch("http://localhost:3000/api/admin/analytics");
        console.log("Status:", res.status);
    } catch(err) {
        console.error(err);
    }
}
testAPI();
