# Graph Visualization Libraries Comparison

## Sigma.js

**Location**: [sigma/](sigma/)

### Pros
- Extremely performant for large graphs (1000+ nodes)
- WebGL-based rendering for smooth interactions
- Built-in camera controls (zoom, pan)
- Simple API for common graph operations
- Good support for force-directed layouts via plugins
- Designed specifically for network visualization

### Cons
- Less flexibility for custom visualizations
- Fewer layout algorithms built-in (relies on plugins)
- Steeper learning curve for advanced customizations
- Limited to graph/network visualizations only

### Best For
- Large social networks
- Performance-critical applications
- Standard network visualizations
- When you need smooth pan/zoom out of the box

---

## D3.js

**Location**: [d3/](d3/)

### Pros
- Maximum flexibility and customization
- Extensive layout algorithms (force, hierarchy, etc.)
- Rich ecosystem and community
- Can create any type of data visualization
- Fine-grained control over every aspect
- Excellent documentation and examples

### Cons
- Steeper learning curve
- More code required for basic tasks
- Performance can degrade with very large graphs (500+ nodes)
- Requires more manual setup for interactions

### Best For
- Custom visualizations
- Multiple visualization types in one project
- When you need precise control
- Hierarchical or specialized layouts
- Data journalism and interactive reports

---

## Vanilla SVG

**Location**: [svg/](svg/)

### Pros
- No dependencies, minimal bundle size
- Full control over rendering
- Easy to understand and debug
- Great for learning graph visualization concepts
- Fast for small to medium graphs
- Direct DOM manipulation

### Cons
- Must implement everything from scratch
- Poor performance for large graphs (100+ nodes)
- No built-in layouts or physics
- Significant development time for features
- Limited interactivity without additional code

### Best For
- Small graphs (< 100 nodes)
- Educational purposes
- Simple, static visualizations
- When bundle size is critical
- Learning how graph rendering works
- Projects with unique requirements where libraries are overkill

---

## Summary Table

| Feature | Sigma.js | D3.js | Vanilla SVG |
|---------|----------|-------|-------------|
| Performance (large graphs) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| Flexibility | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Learning Curve | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Bundle Size | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Built-in Features | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| Development Speed | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Community/Docs | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | N/A |

---

## Recommendations

- **Use Sigma.js** if you're building a network visualization with 100+ nodes and need performance
- **Use D3.js** if you need flexibility, multiple chart types, or complex custom layouts
- **Use Vanilla SVG** if you have a simple use case, want to learn, or need minimal dependencies
