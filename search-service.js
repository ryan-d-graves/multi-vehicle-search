const listings = require('./listings.json')

const getLocationsFromListings = (listings) => {
  let locations = []
  for (let listing of listings) {
    if (!locations.includes(listing.location_id)) {
      locations.push(listing.location_id)
    }
  }
  return locations
}

const locations = getLocationsFromListings(listings)

exports.search = (req, res) => {
  let vehicles = []
  for (let item of req.body) {
    for (let i = 0; i < item.quantity; i++) {
      vehicles.push(item.length)
    }
  }
  if (vehicles.length === 0) {
    return res.status(400).send("No vehicles provided!")
  }
  if (vehicles.length > 14) {
    return res.status(400).send('Too many vehicles! Running this many would take too long and clog up the server.')
  }
  const results = runSearch(vehicles)
  res.send(results)
}

const runSearch = (vehicles) => {
  vehicles.sort((a, b) => b - a)
  const results = []
  for (let location of locations) {
    const result = runBinPacking(vehicles, location)
    if (result) {
      results.push(result)
    }
  }
  results.sort((a, b) => a.total_price_in_cents - b.total_price_in_cents)
  return results
}

const runBinPacking = (vehicles, location_id) => {
  const listingsAtLocation = listings
    .filter(listing => listing.location_id === location_id)
    .map(({ length, width, id, price_in_cents: price }) => ({ length, width, id, price }));

  let bestSolution = []
  let bestSolutionCost = Infinity

  const getCostOfBins = (bins) => {
    const uniqueListingIds = new Set(bins.map(bin => bin.listing_id))
    let cost = 0
    for (let listing of listingsAtLocation) {
      if (uniqueListingIds.has(listing.id)) {
        cost += listing.price
      }
    }
    return cost
  }

  function packBins(bins, remaining) {
    // No remaining = solution found
    if (remaining.length === 0) {
      const cost = getCostOfBins(bins)
      if (cost < bestSolutionCost) {
        bestSolution = bins.map(bin => ({ ...bin, vehicles: [...bin.vehicles] }))
        bestSolutionCost = cost
      }
      return
    }

    // Branch-and-bound
    if (getCostOfBins(bins) >= bestSolutionCost) {
      return
    }

    // Try to pack the first (largest) vehicle into each used bin
    const nextVehicle = remaining[0]
    const remainingVehicles = remaining.slice(1)
    for (let bin of bins) {
      const filledSpace = bin.vehicles.reduce((sum, length) => sum + length, 0)
      if (bin.length - filledSpace >= nextVehicle) {
        bin.vehicles.push(nextVehicle)
        packBins(bins, remainingVehicles)
        bin.vehicles.pop()
      }
    }

    // Try to pack the first (largest) vehicle into a new bin
    const unusedListings = listingsAtLocation.filter(listing => 
      !bins.some(bin => bin.listing_id === listing.id) && listing.length >= nextVehicle
    )
    if (unusedListings.length === 0) return

    const cheapestListing = unusedListings.reduce((a, b) => a.price < b.price ? a : b)
    const rows = Math.floor(cheapestListing.width / 10)
    for (let i = 0; i < rows; i++) {
      bins.push({
        length: cheapestListing.length,
        listing_id: cheapestListing.id,
        vehicles: i === 0 ? [nextVehicle] : [],
      })
    }
    packBins(bins, remainingVehicles)
    for (let i = 0; i < rows; i++) {
      bins.pop()
    }
  }

  packBins([], vehicles)

  const bestListingIds = Array.from(new Set(bestSolution.map(bin => bin.listing_id)))
  return bestSolution.length > 0 
  ? {
    location_id,
    listing_ids: bestListingIds,
    total_price_in_cents: bestSolutionCost
  }
  : null
}
