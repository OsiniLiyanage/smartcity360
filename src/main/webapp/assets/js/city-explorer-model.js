(function(root,factory){
    const model=factory(); if(typeof module==='object'&&module.exports)module.exports=model;else root.CityExplorerModel=model;
})(typeof globalThis==='object'?globalThis:this,()=>{
    const key=node=>`${node.type}:${node.id}`;
    function path(root,target,trail=[]) {
        if(!root)return null;
        const next=[...trail,root];if(key(root)===target)return next;
        for(const child of root.children||[]) {const found=path(child,target,next);if(found)return found;}
        return null;
    }
    function listing(node,search='',page=0) {
        const query=search.trim().toLocaleLowerCase();
        const rows=(node?.children||[]).filter(child=>child.name.toLocaleLowerCase().includes(query));
        const pages=Math.max(1,Math.ceil(rows.length/25)),current=Math.max(0,Math.min(Number.isFinite(page)?Math.trunc(page):0,pages-1));
        return {rows:rows.slice(current*25,current*25+25),total:rows.length,page:current,pages};
    }
    return {key,path,listing};
});
