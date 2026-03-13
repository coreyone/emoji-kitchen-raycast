import os
import json
import base64
import subprocess

REPO = "coreyone/extensions"
BRANCH = "add-emoji-kitchen-extension"
FILES = [
    ("CHANGELOG.md", "extensions/emoji-kitchen/CHANGELOG.md"),
    ("package-lock.json", "extensions/emoji-kitchen/package-lock.json"),
    ("package.json", "extensions/emoji-kitchen/package.json"),
    (".eslintrc.json", "extensions/emoji-kitchen/.eslintrc.json"),
    ("src/index.tsx", "extensions/emoji-kitchen/src/index.tsx"),
    ("src/utils.ts", "extensions/emoji-kitchen/src/utils.ts"),
    ("src/types.ts", "extensions/emoji-kitchen/src/types.ts"),
    ("src/constants.ts", "extensions/emoji-kitchen/src/constants.ts"),
    ("src/components/MashupGrid.tsx", "extensions/emoji-kitchen/src/components/MashupGrid.tsx"),
    ("src/components/ResultView.tsx", "extensions/emoji-kitchen/src/components/ResultView.tsx"),
    ("metadata/1.png", "extensions/emoji-kitchen/metadata/1.png"),
    ("metadata/emoji-kitchen-mashup.png", "extensions/emoji-kitchen/metadata/emoji-kitchen-mashup.png"),
    ("assets/vectors.json", "extensions/emoji-kitchen/assets/vectors.json"),
    ("README.md", "extensions/emoji-kitchen/README.md"),
]

def gh_api(endpoint, method="GET", data=None):
    cmd = ["gh", "api", "-X", method, endpoint]
    if data:
        cmd.extend(["-f", f"data={json.dumps(data)}"])
    
    # For creating blobs/trees, we need raw input sometimes or specific flags
    # Let's use a more flexible version
    process = subprocess.run(["gh", "api", endpoint, "-X", method] + (["--input", "-"] if data else []), 
                            input=json.dumps(data).encode() if data else None,
                            capture_output=True)
    if process.returncode != 0:
        print(f"Error calling API {endpoint}: {process.stderr.decode()}")
        return None
    return json.loads(process.stdout)

def main():
    print(f"Starting surgical commit to {REPO} on branch {BRANCH}...")
    
    # 1. Get latest commit SHA
    ref = gh_api(f"repos/{REPO}/git/ref/heads/{BRANCH}")
    if not ref: return
    last_commit_sha = ref['object']['sha']
    print(f"Last commit: {last_commit_sha}")
    
    # 2. Get the tree SHA from the last commit
    commit = gh_api(f"repos/{REPO}/git/commits/{last_commit_sha}")
    base_tree_sha = commit['tree']['sha']
    print(f"Base tree: {base_tree_sha}")
    
    # 3. Create blobs for the new files
    new_tree_items = []
    for local_path, repo_path in FILES:
        with open(local_path, "rb") as f:
            content = base64.b64encode(f.read()).decode()
        
        blob = gh_api(f"repos/{REPO}/git/blobs", method="POST", data={
            "content": content,
            "encoding": "base64"
        })
        if not blob: return
        
        new_tree_items.append({
            "path": repo_path,
            "mode": "100644",
            "type": "blob",
            "sha": blob['sha']
        })
        print(f"Created blob for {repo_path}")

    # 4. Create new tree
    new_tree = gh_api(f"repos/{REPO}/git/trees", method="POST", data={
        "base_tree": base_tree_sha,
        "tree": new_tree_items
    })
    if not new_tree: return
    new_tree_sha = new_tree['sha']
    print(f"Created new tree: {new_tree_sha}")
    
    # 5. Create new commit
    new_commit = gh_api(f"repos/{REPO}/git/commits", method="POST", data={
        "message": "Fix: Add missing 'Combinations' type import",
        "tree": new_tree_sha,
        "parents": [last_commit_sha]
    })
    if not new_commit: return
    new_commit_sha = new_commit['sha']
    print(f"Created new commit: {new_commit_sha}")
    
    # 6. Update branch ref
    update = gh_api(f"repos/{REPO}/git/refs/heads/{BRANCH}", method="PATCH", data={
        "sha": new_commit_sha,
        "force": False
    })
    if update:
        print("Successfully updated branch! CI should restart now.")

if __name__ == "__main__":
    main()
