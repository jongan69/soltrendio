export const getEndpoint = async () => {
    // console.log(process.env.NGROK_API_KEY)
    try {
        const response = await fetch('https://api.ngrok.com/tunnels',
            {
                headers: {
                    'Authorization': `Bearer ${process.env.NGROK_API_KEY}`,
                    'Ngrok-Version': '2'
                }
            }
        )
        // console.log(response)
        const data = await response.json()
        const url = data.tunnels[0].public_url
        return url
    } catch (error) {
        console.error('Error fetching endpoint:', error)
        return null
    }
}